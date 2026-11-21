class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function obrigatorio(valor, campo) {
  if (valor === undefined || valor === null || String(valor).trim() === '') {
    throw new HttpError(400, `O campo "${campo}" é obrigatório.`);
  }
}

function inteiroNaoNegativo(valor, campo) {
  const n = Number(valor);
  if (!Number.isInteger(n) || n < 0) {
    throw new HttpError(400, `O campo "${campo}" deve ser um número inteiro maior ou igual a zero.`);
  }
  return n;
}

function idValido(valor) {
  const n = Number(valor);
  if (!Number.isInteger(n) || n <= 0) throw new HttpError(400, 'ID inválido.');
  return n;
}

const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

module.exports = { HttpError, obrigatorio, inteiroNaoNegativo, idValido, wrap };
