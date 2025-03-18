import express from 'express';
import { addToList, removeFromList, listUserLists } from '../controllers/listController.js';

const router = express.Router();

router.post('/lists', addToList);  // Adicionar conteúdo à lista
router.delete('/lists', removeFromList); // Remover conteúdo da lista
router.get('/lists/:usuario_id', listUserLists); // Listar conteúdos das listas do usuário

export default router;
