require('dotenv').config();
const express = require('express');
const path = require('path');
const Groq = require('groq-sdk');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

app.post('/api/extract', async (req, res) => {
  const { message } = req.body;
  if (!message || !message.trim()) {
    return res.status(400).json({ error: 'Mensaje vacio' });
  }

  const prompt = `Extraé los siguientes datos de este mensaje de WhatsApp de un pedido. Respondé SOLO con un JSON válido, sin explicaciones ni markdown.

Campos a extraer:
- nombre: nombre completo de la persona (null si no está)
- direccion: dirección de entrega con calle, número, piso/depto si hay (null si no está)
- ciudad: ciudad o localidad de entrega (null si no está)
- telefono: número de celular o teléfono (null si no está)

Mensaje:
${message.trim()}

JSON:`;

  try {
    const completion = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0,
      max_tokens: 300,
    });

    const raw = completion.choices[0]?.message?.content?.trim() || '';
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON in response');
    const data = JSON.parse(jsonMatch[0]);

    res.json({ success: true, data });
  } catch (err) {
    console.error('Groq error:', err.message);
    res.status(500).json({ error: 'Error al procesar el mensaje', detail: err.message });
  }
});

// Local dev
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`\nTropilla Pedidos corriendo en: http://localhost:${PORT}\n`);
  });
}

module.exports = app;
