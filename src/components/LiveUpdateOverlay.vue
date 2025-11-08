<template>
  <div v-if="!isConnected" class="overlay">
    <div class="overlay-content">
      <p>Live Update is not connected. Please check your connection.</p>
      <p class="connection-user-info">{{ liveUpdate.connectionUserInfo }}</p>
      <button @click="liveUpdate.reconnect">Reconnect</button>
    </div>
  </div>
</template>

<script>
import { computed } from 'vue';

export default {
  name: 'LiveUpdateOverlay',
  props: {
    liveUpdate: {
      type: Object,
      required: true
    }
  },
  setup(props) {
    const isConnected = computed(() => props.liveUpdate.status.value === 'OPEN');
    return { isConnected };
  }
};
</script>

<style scoped>
.overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.overlay-content {
  background: white;
  padding: 20px;
  border-radius: 8px;
  text-align: center;
}

button {
  margin-top: 10px;
  padding: 10px 20px;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

button:hover {
  background-color: #0056b3;
}

.connection-user-info {
  font-size: 0.9em;
  color: gray;
}
</style>
