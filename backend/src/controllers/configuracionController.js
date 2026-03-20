import * as configuracionService from "../services/configuracionService.js";

export const obtener = async (req, res) => {
  try {
    const data = await configuracionService.obtener();
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

export const guardar = async (req, res) => {
  try {
    const data = await configuracionService.guardar(req.body);
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
