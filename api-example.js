const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');

const app = express();
const PORT = process.env.PORT || 8000;

// CORS настройки - разрешаем запросы от фронтенда
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));

app.use(express.json());

// Настройки Keycloak
const KEYCLOAK_URL = process.env.KEYCLOAK_URL || 'http://localhost:8080';
const KEYCLOAK_ISSUER_URL = process.env.KEYCLOAK_ISSUER_URL || KEYCLOAK_URL;
const REALM = process.env.REALM || 'reports-realm';
const JWKS_URI = `${KEYCLOAK_URL}/realms/${REALM}/protocol/openid-connect/certs`;

// Клиент для получения публичных ключей от Keycloak
const client = jwksClient({
  jwksUri: JWKS_URI
});

// Функция для получения публичного ключа по ID
function getKey(header, callback) {
  client.getSigningKey(header.kid, (err, key) => {
    if (err) {
      console.error('Ошибка получения ключа:', err);
      return callback(err);
    }
    
    if (!key) {
      console.error('Ключ не найден для kid:', header.kid);
      return callback(new Error('Ключ подписи не найден'));
    }
    
    const signingKey = key.publicKey || key.rsaPublicKey;
    
    if (!signingKey) {
      console.error('Публичный ключ не найден в объекте:', key);
      return callback(new Error('Публичный ключ не найден'));
    }
    
    callback(null, signingKey);
  });
}

// Middleware для проверки JWT токена
const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Отсутствует или неверный заголовок авторизации' });
  }

  const token = authHeader.substring(7);

  // Проверяем JWT токен с помощью публичного ключа от Keycloak
  jwt.verify(token, getKey, {
    issuer: `${KEYCLOAK_ISSUER_URL}/realms/${REALM}`,
    algorithms: ['RS256']
  }, (err, decoded) => {
    if (err) {
      return res.status(401).json({ error: 'Неверный токен', details: err.message });
    }
    
    req.user = decoded;
    next();
  });
};

// Проверка роли пользователя
const requireRole = (role) => {
  return (req, res, next) => {
    const userRoles = req.user.realm_access?.roles || [];
    
    if (!userRoles.includes(role)) {
      return res.status(403).json({ 
        error: 'Недостаточно прав', 
        required: role,
        userRoles: userRoles 
      });
    }
    
    next();
  };
};

// Маршруты
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});



// Основной эндпоинт для получения отчетов - только для пользователей с ролью prothetic_user
app.get('/reports', verifyToken, requireRole('prothetic_user'), (req, res) => {
  // Базовая информация отчета
  const baseReport = {
    id: `report_${Date.now()}`,
    userId: req.user.sub,
    username: req.user.preferred_username,
    generatedAt: new Date().toISOString(),
    type: 'prosthetic_usage_report'
  };

  // Данные для пользователя протезов
  res.json({
    ...baseReport,
    data: {
      deviceUsage: '92%',
      sessionsCount: 45,
      averageSessionTime: '2.5 часа',
      maintenanceStatus: 'Отлично',
      devices: [
        { name: 'Протез руки v2.1', usage: '95%', status: 'Активен' },
        { name: 'Протез ноги v1.8', usage: '88%', status: 'Активен' }
      ],
      recentSessions: [
        { date: '2024-01-15', duration: '3.2 часа', efficiency: '94%' },
        { date: '2024-01-14', duration: '2.8 часа', efficiency: '91%' },
        { date: '2024-01-13', duration: '3.5 часа', efficiency: '96%' }
      ]
    },
    access_level: 'prothetic_user'
  });
});

// Обработка ошибок
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Что-то пошло не так!' });
});

app.listen(PORT, () => {
  console.log(`API сервер запущен на порту ${PORT}`);
  console.log(`Проверка здоровья: http://localhost:${PORT}/health`);
}); 