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
  'ESP32_1': 'Desconectado',
  'ESP32_2': 'Desconectado',
  'ESP32_3': 'Desconectado'
};

// Conexión con MQTT
mqttClient.on('connect', () => {
  console.log('Conectado al broker MQTT');
  
  mqttClient.on('connect', () => {
    console.log('Conectado al broker MQTT');
    // No suscribimos a tópicos globales aquí
    // Las suscripciones serán dinámicas cuando un cliente se conecte
  });
  
});

// Manejo de mensajes MQTT
mqttClient.on('message', (topic, message) => {
  const msg = message.toString();
  console.log(`Mensaje recibido desde broker MQTT en el tópico ${topic}: ${msg}`);

  // Comprobamos si el tópico comienza con 'ESP32/'
  if (topic.startsWith('ESP32/')) {
    // Extraemos el deviceId y el controlId del tópico
    const parts = topic.split('/');
    const deviceId = parts[1];  // El ID del dispositivo es el segundo segmento
    const controlId = parts[2]; // El tercer segmento es el control (status1 o status2)

    // Actualizamos el estado del dispositivo con el valor recibido en el mensaje
    devices[deviceId] = devices[deviceId] || {}; // Si el dispositivo no existe, lo inicializamos

    // Actualizamos el estado de 'status1' o 'status2' dependiendo del controlId
    devices[deviceId][controlId] = msg;
    console.log('Estado del dispositivo actualizado:', deviceId, controlId, msg);

    // Enviamos la actualización del estado al cliente a través de WebSocket
    io.emit('deviceStatusUpdate', { device: deviceId, control: controlId, state: msg });
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
  const { action, device, controlId } = req.body; // Acción esperada: 'ON' o 'OFF', y dispositivo
  
  if (action === 'ON' || action === 'OFF') {
    const topic = `ESP32/${device}/${controlId}`;
    // Publicar mensaje en el tópico de control del dispositivo
    mqttClient.publish(topic, action, (err) => {
      if (err) {
        return res.status(500).json({ error: 'Error al publicar el mensaje en el broker MQTT' });
      }
      res.json({ message: `Dispositivo ${device} ${action} en el control ${controlId}` });
    });
  } else {
    res.status(400).json({ error: 'Acción inválida. Debe ser "ON" o "OFF".' });
  }
});

// Servir archivos estáticos desde la carpeta 'public'
app.use(express.static('public'));


// Manejo de conexión de WebSocket (Socket.IO)
io.on('connection', (socket) => {
  console.log('Cliente conectado:', socket.id);

  // Obtener el ID del dispositivo desde el parámetro 'device' enviado desde el cliente
  socket.on('subscribe', (deviceId) => {
    console.log(`Cliente suscrito a: ESP32/${deviceId}/status1 y ESP32/${deviceId}/status2`);
    
    // Suscribimos a los tópicos de estado
    mqttClient.subscribe(`ESP32/${deviceId}/status1`, (err) => {
      if (err) console.error('Error al suscribirse al tópico status1:', err);
    });
    mqttClient.subscribe(`ESP32/${deviceId}/status2`, (err) => {
      if (err) console.error('Error al suscribirse al tópico status2:', err);
    });

    // Publicar el mensaje "ESTADO" en el tópico .../status cuando se conecta un cliente
    mqttClient.publish(`ESP32/${deviceId}/status`, 'ESTADO', (err) => {
      if (err) {
        console.error('Error al publicar en el tópico status:', err);
      } else {
        console.log(`Publicado "ESTADO" en el tópico ESP32/${deviceId}/status`);
      }
    });
  });

  // Cuando el cliente se desconecta, desuscribimos de los tópicos correspondientes
  socket.on('disconnect', () => {
    console.log('Cliente desconectado:', socket.id);
    const deviceId = socket.deviceId; // Supongamos que guardamos el deviceId cuando se conecta
    if (deviceId) {
      mqttClient.unsubscribe(`ESP32/${deviceId}/status1`, (err) => {
        if (err) console.error('Error al desuscribirse del tópico status1:', err);
      });
      mqttClient.unsubscribe(`ESP32/${deviceId}/status2`, (err) => {
        if (err) console.error('Error al desuscribirse del tópico status2:', err);
      });
    }
  });
});

// Iniciar el servidor HTTP para WebSockets en el puerto 3000
httpServer.listen(port, () => {
  console.log(`API corriendo en el puerto ${port}`);
});
