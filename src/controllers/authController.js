import * as authService from '../services/authService.js';

export const register = async (req, res) => {
  const { nome, email, senha } = req.body;
  const response = await authService.register({ nome, email, senha });
  res.status(response.status).json(response);
};

export const login = async (req, res) => {
  const { email, senha } = req.body;
  const response = await authService.login({ email, senha });
  res.status(response.status).json(response);
};

export const updateProfile = async (req, res) => {
  const id = req.user.id;
  const updates = req.body;
  const response = await authService.updateProfile(id, updates);
  res.status(response.status).json(response);
};

export const getAvatars = async (req, res) => {
    const response = await authService.listAvatars();
    res.status(response.status).json(response);
  };

  
