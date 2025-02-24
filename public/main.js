// Import App and router (which are now simple objects or functions)
import App from './App.js';
import router from './router/index.js';

console.log(Vue.version);

// // Create the Vue app and use the router
const app = Vue.createApp(App);

app.use(router);



// Configure Vue to exclude 'draggable' and 'Draggable' from custom element resolution
// app.config.compilerOptions.isCustomElement = (tag) => tag !== 'draggable' && tag !== 'Draggable';

// Register draggable globally, with debugging and proper handling
if (window.vuedraggable) {
  // Log the vuedraggable object for debugging
  console.log('vuedraggable:', window.vuedraggable);

  // Check if vuedraggable is a valid Vue component (function, or object with render/setup)
  if (typeof window.vuedraggable === 'function' || window.vuedraggable.render) {
    app.component('Draggable', window.vuedraggable); // Use capital 'D' for consistency
    console.log('vuedraggable registered successfully as Draggable');
  } else {
    console.error('vuedraggable is not a valid Vue component:', window.vuedraggable);
  }
} else {
  console.error('vuedraggable not found on window object');
}

  
app.mount('#app');
