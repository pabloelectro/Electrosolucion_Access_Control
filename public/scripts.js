document.addEventListener('DOMContentLoaded', function() {
    const statusElement = document.getElementById('status');
    const ledElement = document.getElementById('led');
    const onButton = document.getElementById('onButton');
    const deviceNameElement = document.getElementById('deviceName');
  
    // Obtener el ID del dispositivo desde el enlace
    const urlParams = new URLSearchParams(window.location.search);
    const deviceId = urlParams.get('device');  // Ejemplo: ?device=ESP32_1
  
    // Actualizamos el nombre del dispositivo en la interfaz
    deviceNameElement.innerText = `Dispositivo: ${deviceId}`;
  
    // Conectar al servidor WebSocket
    const socket = io.connect();  // Esto conecta al servidor automáticamente en el mismo puerto
  
    // Función para actualizar el estado del dispositivo en la interfaz
    function updateDeviceStatus(state) {
      if (state === 'ON') {
        statusElement.innerText = 'Encendido';
        ledElement.style.backgroundColor = 'green';  // LED verde cuando está encendido
      } else if (state === 'OFF') {
        statusElement.innerText = 'Apagado';
        ledElement.style.backgroundColor = 'grey';  // LED apagado
      } else {
        statusElement.innerText = 'Desconocido';  // Si el estado no es ni 'ON' ni 'OFF'
        ledElement.style.backgroundColor = 'grey';  // LED apagado
      }
    }
  
    // Recibir actualizaciones de estado a través de WebSocket
    socket.on('deviceStatusUpdate', (data) => {
      console.log('Estado recibido desde el servidor a través de WebSocket:', data);
      if (data.device === deviceId) {
        updateDeviceStatus(data.state);  // Actualizar el estado solo para este dispositivo
      }
    });
  
    // Llamar al servidor para obtener el estado inicial del dispositivo
    fetch(`/control?device=${deviceId}`)
      .then(response => response.json())
      .then(data => {
        console.log('Estado recibido desde el servidor:', data);
        // Actualizar el estado cuando se carga la página
        updateDeviceStatus(data.state);
      })
      .catch(error => {
        console.error('Error al obtener el estado del dispositivo:', error);
      });
  
    // Evento para encender el dispositivo
    onButton.addEventListener('click', function() {
      fetch('/control', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'ON', device: deviceId })
      })
      .then(response => response.json())
      .then(data => {
        console.log('Dispositivo encendido:', data);
        //updateDeviceStatus('ON');  // Actualizar el estado después de encender el dispositivo
      })
      .catch(error => {
        console.error('Error al encender el dispositivo:', error);
      });
    });
  });
  