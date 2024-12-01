document.addEventListener('DOMContentLoaded', function() {
  const statusElement1 = document.getElementById('status1');
  const ledElement1 = document.getElementById('led1');
  const onButton1 = document.getElementById('onButton1');
  
  const statusElement2 = document.getElementById('status2');
  const ledElement2 = document.getElementById('led2');
  const onButton2 = document.getElementById('onButton2');
  
  const deviceNameElement = document.getElementById('deviceName');
  
  // Obtener el ID del dispositivo desde el enlace
  const urlParams = new URLSearchParams(window.location.search);
  const deviceId = urlParams.get('device');  // Ejemplo: ?device=ESP32_1
  
  // Actualizamos el nombre del dispositivo en la interfaz
  deviceNameElement.innerText = `Dispositivo: ${deviceId}`;
  
  // Conectar al servidor WebSocket
  const socket = io.connect();
  
  // Suscripción a los tópicos 'status1' y 'status2' dinámicamente según el deviceId
  socket.emit('subscribe', deviceId);

  // Recibir actualizaciones de estado desde el servidor WebSocket
  socket.on('deviceStatusUpdate', (data) => {
    if (data.device === deviceId) {
      if (data.control === 'status1') {
        // Actualizamos el estado y el LED según el valor recibido en 'status1'
        if (data.state === 'ON') {
          statusElement1.innerText = 'Encendido';
          ledElement1.style.backgroundColor = 'green';  // LED verde
        } else if (data.state === 'OFF') {
          statusElement1.innerText = 'Apagado';
          ledElement1.style.backgroundColor = 'grey';  // LED apagado
        }
      } else if (data.control === 'status2') {
        // Actualizamos el estado y el LED según el valor recibido en 'status2'
        if (data.state === 'ON') {
          statusElement2.innerText = 'Encendido';
          ledElement2.style.backgroundColor = 'green';  // LED verde
        } else if (data.state === 'OFF') {
          statusElement2.innerText = 'Apagado';
          ledElement2.style.backgroundColor = 'grey';  // LED apagado
        }
      }
    }
  });
  
  // Evento para encender/apagar el dispositivo en el control 1
  onButton1.addEventListener('click', function() {
    const action = statusElement1.innerText === 'Encendido' ? 'OFF' : 'ON';
    fetch('/control', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ action: action, device: deviceId, controlId: 'control1' })
    })
    .then(response => response.json())
    .then(data => {
      console.log('Respuesta al controlar el dispositivo:', data);
    })
    .catch(error => {
      console.error('Error al controlar el dispositivo:', error);
    });
  });

  // Evento para encender/apagar el dispositivo en el control 2
  onButton2.addEventListener('click', function() {
    const action = statusElement2.innerText === 'Encendido' ? 'OFF' : 'ON';
    fetch('/control', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ action: action, device: deviceId, controlId: 'control2' })
    })
    .then(response => response.json())
    .then(data => {
      console.log('Respuesta al controlar el dispositivo:', data);
    })
    .catch(error => {
      console.error('Error al controlar el dispositivo:', error);
    });
  });
  
  // Cuando el cliente se desconecte, dejar de suscribirse a los tópicos
  window.addEventListener('beforeunload', function() {
    socket.emit('unsubscribe', deviceId);
  });
});
