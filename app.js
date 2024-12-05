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
const mqttClient = mqtt.connect('mqtts://9172c8f292e643d9a364e53bfa3282f0.s1.eu.hivemq.cloud:8883', {
  username: 'electrosolucion',
  password: '2025Electrosolucion.com',
  ca: fs.readFileSync('./certs/ca.crt') // Si es necesario
});

// Estado de los dispositivos (en este caso un ejemplo simple de 3 dispositivos)
let devices = {
  'a1b2c3d4e5f6': 'disconnected',
  'b2d3e4f5g6h7': 'disconnected',
  'c3f4g5h6i7j8': 'disconnected',
  'd4g5h6i7j8k9': 'disconnected',
  'e5h6i7j8k9l0': 'disconnected',
  'f6i7j8k9l0m1': 'disconnected',
  'g7j8k9l0m1n2': 'disconnected',
  'h8k9l0m1n2o3': 'disconnected',
  'i9l0m1n2o3p4': 'disconnected',
  'j10m1n2o3p4q5': 'disconnected',
  'k11n2o3p4q5r6': 'disconnected',
  'l12o3p4q5r6s7': 'disconnected',
  'm13p4q5r6s7t8': 'disconnected',
  'n14q5r6s7t8u9': 'disconnected',
  'o15r6s7t8u9v0': 'disconnected',
  'p16s7t8u9v0w1': 'disconnected',
  'q17t8u9v0w1x2': 'disconnected',
  'r18u9v0w1x2y3': 'disconnected',
  's19v0w1x2y3z4': 'disconnected',
  't20w1x2y3z4a5': 'disconnected',
  'u21x2y3z4a5b6': 'disconnected',
  'v22y3z4a5b6c7': 'disconnected',
  'w23z4a5b6c7d8': 'disconnected',
  'x24a5b6c7d8e9': 'disconnected',
  'y25b6c7d8e9f0': 'disconnected',
  'z26c7d8e9f0g1': 'disconnected',
  'a27d8e9f0g1h2': 'disconnected',
  'b28e9f0g1h2i3': 'disconnected',
  'c29f0g1h2i3j4': 'disconnected',
  'd30g1h2i3j4k5': 'disconnected',
  'e31h2i3j4k5l6': 'disconnected',
  'f32i3j4k5l6m7': 'disconnected',
  'g33j4k5l6m7n8': 'disconnected',
  'h34k5l6m7n8o9': 'disconnected',
  'i35l6m7n8o9p0': 'disconnected',
  'j36m7n8o9p0q1': 'disconnected',
  'k37n8o9p0q1r2': 'disconnected',
  'l38o9p0q1r2s3': 'disconnected',
  'm39p0q1r2s3t4': 'disconnected',
  'n40q1r2s3t4u5': 'disconnected',
  'o41r2s3t4u5v6': 'disconnected',
  'p42s3t4u5v6w7': 'disconnected',
  'q43t4u5v6w7x8': 'disconnected',
  'r44u5v6w7x8y9': 'disconnected',
  's45v6w7x8y9z0': 'disconnected',
  't46w7x8y9z0a1': 'disconnected',
  'u47x8y9z0a1b2': 'disconnected',
  'v48y9z0a1b2c3': 'disconnected',
  'w49z0a1b2c3d4': 'disconnected',
  'x50a1b2c3d4e5': 'disconnected'
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
    console.log(`Cliente suscrito a: ESP32/${deviceId}/status1, ESP32/${deviceId}/status2 y ESP32/${deviceId}/status2`);
    
    // Suscribimos a los tópicos de estado
    mqttClient.subscribe(`ESP32/${deviceId}/status1`, (err) => {
      if (err) console.error('Error al suscribirse al tópico status1:', err);
    });
    mqttClient.subscribe(`ESP32/${deviceId}/status2`, (err) => {
      if (err) console.error('Error al suscribirse al tópico status2:', err);
    });

    // Suscribimos al tópico name, el cual recibirá el nombre asignado al dispositivo
    mqttClient.subscribe(`ESP32/${deviceId}/name`, (err) => {
      if (err) console.error('Error al suscribirse al tópico name:', err);
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
      mqttClient.unsubscribe(`ESP32/${deviceId}/name`, (err) => {
        if (err) console.error('Error al desuscribirse del tópico status2:', err);
      });
    }
  });
});

// Iniciar el servidor HTTP para WebSockets en el puerto 3000
httpServer.listen(port, () => {
  console.log(`API corriendo en el puerto ${port}`);
});
