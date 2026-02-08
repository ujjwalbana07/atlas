import axios from 'axios'
import type { OrderCommand } from '../types'

const API_BASE = 'http://localhost:8001'

export const api = {
    submitOrder: async (order: OrderCommand) => {
        return axios.post(`${API_BASE}/orders`, order)
    }
}
