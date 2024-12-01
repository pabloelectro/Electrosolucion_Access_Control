const express = require('express');
const mqtt = require('mqtt');
const fs = require('fs');
const http = require('http');
const bodyParser = require('body-parser');
const socketIo = require('socket.io');

// Configuración del servidor Express
const app = express();
//const port = 3000;
const port = process.env.PORT || 3000;  // Usar el puerto de Render o 3000 por defecto


// Usar body-parser para analizar el cuerpo de las solicitudes POST
app.use(bodyParser.json());

// Crear el servidor HTTP para WebSockets
const httpServer = http.createServer(app);
const io = socketIo(httpServer);  // Configuración de WebSocket

// Conexión al broker MQTT con SSL/TLS
const mqttClient = mqtt.connect('mqtts://d8badc4d4c1749ea9b0f242d1e1a0c91.s1.eu.hivemq.cloud:8883', {
  username: 'UserMQTT',
  password: '12345678',
  ca: fs.readFileSync('./certs/ca.crt') // Si es necesario
});

// Estado de los dispositivos (en este caso un ejemplo simple de 3 dispositivos)
let devices = {
  'ESP32_1': 'Desconocido',
  'ESP32_2': 'Desconocido',
  'ESP32_3': 'Desconocido'
};

// Conexión con MQTT
mqttClient.on('connect', () => {
  console.log('Conectado al broker MQTT');
  
  // Suscripción a todos los dispositivos (esto puede hacerse dinámicamente)
  Object.keys(devices).forEach((deviceId) => {
    mqttClient.subscribe(`ESP32/${deviceId}/status`, (err) => {
      if (err) {
        console.error('Error al suscribirse al tópico:', err);
      } else {
        console.log(`Suscrito al tópico ESP32/${deviceId}/status`);
      }
    });
  });
});

// Manejo de mensajes MQTT
mqttClient.on('message', (topic, message) => {
  const msg = message.toString();
  console.log(`Mensaje recibido desde broker MQTT en el tópico ${topic}: ${msg}`);

  if (topic.startsWith('ESP32/')) {
    const deviceId = topic.split('/')[1];  // Extraer el ID del dispositivo del tópico
    devices[deviceId] = msg;
    console.log('Estado del dispositivo actualizado:', deviceId, devices[deviceId]);
    io.emit('deviceStatusUpdate', { device: deviceId, state: msg });
  }
});

// Endpoint para obtener el estado de un dispositivo específico (GET)
app.get('/device', (req, res) => {
  const deviceId = req.query.device;  // Obtener el parámetro 'device' de la URL
  if (devices[deviceId]) {
    // Si el dispositivo existe, servir la página específica para ese dispositivo
    res.sendFile(__dirname + `/public/index.html`); // Enviar el HTML del dispositivo
  } else {
    res.status(404).json({ error: 'Dispositivo no encontrado' });
  }
});

// Endpoint para controlar un dispositivo (POST)
app.post('/control', (req, res) => {
  const { action, device } = req.body; // Acción esperada: 'ON' o 'OFF', y dispositivo
  
  if (action === 'ON' || action === 'OFF') {
    // Publicar mensaje en el tópico de control del dispositivo
    mqttClient.publish(`ESP32/${device}/control`, action, (err) => {
      if (err) {
        return res.status(500).json({ error: 'Error al publicar el mensaje en el broker MQTT' });
      }
      res.json({ message: `Dispositivo ${device} ${action}` });
    });
  } else {
    res.status(400).json({ error: 'Acción inválida. Debe ser "ON" o "OFF".' });
  }
});

// Servir archivos estáticos desde la carpeta 'public'
app.use(express.static('public'));

// Iniciar el servidor HTTP para WebSockets en el puerto 3000
httpServer.listen(port, () => {
  console.log(`API corriendo en el puerto ${port}`);
});
