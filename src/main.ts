import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import PrimeVue from 'primevue/config';
import Aura from "@primeuix/themes/aura";

const pinia = createPinia()
const app = createApp(App)

app.use(router)
app.use(pinia)
app.use(PrimeVue, {
	theme: {
		preset: Aura,
		options: {
			prefix: 'ds'
		}
	}
});

app.mount('#app')
