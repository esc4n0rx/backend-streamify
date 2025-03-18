import * as contentService from '../services/contentService.js';

export const listContent = async (req, res) => {
  const { categoria, subcategoria } = req.query; 
  const response = await contentService.listContent(categoria, subcategoria);
  res.status(response.status).json(response);
};
export const addContent = async (req, res) => {
    const response = await contentService.addContent(req.body);
    res.status(response.status).json(response);
  };
  
  export const updateContent = async (req, res) => {
    const { id } = req.params;
    const response = await contentService.updateContent(id, req.body);
    res.status(response.status).json(response);
  };
  
  export const deleteContent = async (req, res) => {
    const { id } = req.params;
    const response = await contentService.deleteContent(id);
    res.status(response.status).json(response);
  };

  
