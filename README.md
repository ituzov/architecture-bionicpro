# Architecture BionicPro - Система отчетов с OAuth2 PKCE

## Что реализовано

**Безопасная система авторизации с современными стандартами OAuth2 + PKCE для веб-приложения отчетов по протезированию.**

## Архитектура

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React App     │    │    Keycloak     │    │   Reports API   │
│  (port 3000)    │    │   (port 8080)   │    │  (port 8000)    │
│                 │    │                 │    │                 │
│ ✅ PKCE Auth    │    │ ✅ Identity     │    │ ✅ JWT Verify   │
│ ✅ JWT Tokens   │    │ ✅ User Store   │    │ ✅ Role Check   │
│ ✅ Russian UI   │    │ ✅ Token Issue  │    │ ✅ Bearer Only  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Безопасность (PKCE)

### Почему PKCE важен:
- **Проблема:** В классическом OAuth2 `client_secret` в JavaScript = небезопасно
- **Решение:** PKCE заменяет статичный секрет на динамическую пару ключей

### Как работает:
1. **Генерируем случайную строку** (code_verifier) в браузере
2. **Хэшируем её** (code_challenge = SHA256(verifier)) 
3. **Отправляем хэш** в Keycloak при авторизации
4. **Показываем оригинал** при обмене кода на токены
5. **Keycloak проверяет:** SHA256(verifier) === stored_challenge

**Результат:** Даже если код перехвачен, без verifier получить токены невозможно!

## Запуск

```bash
# Запуск всех сервисов
docker-compose build

docker-compose up -d

# Проверка работы
curl http://localhost:8000/health
```

**Доступ:**
- **Frontend:** http://localhost:3000
- **Keycloak:** http://localhost:8080
- **API:** http://localhost:8000

## Пользователи

| Логин | Пароль | Роль | Доступ к /reports |
|-------|--------|------|------------------|
| prothetic1 | prothetic123 | prothetic_user | ✅ Да |
| prothetic2 | prothetic123 | prothetic_user | ✅ Да |
| prothetic3 | prothetic123 | prothetic_user | ✅ Да |
| user1 | password123 | user | ❌ 403 |
| admin1 | admin123 | administrator | ❌ 403 |

## Тестирование безопасности

### 1. Невалидный токен:
```bash
curl -H "Authorization: Bearer fake-token" http://localhost:8000/reports
# → 401 {"error":"Неверный токен"}
```

### 2. Нет роли prothetic_user:
```bash
# Логин как user1, получить токен, затем:
curl -H "Authorization: Bearer $TOKEN" http://localhost:8000/reports
# → 403 {"error":"Недостаточно прав"}
```

### 3. Валидный доступ:
```bash
# Логин как prothetic1, получить токен, затем:
curl -H "Authorization: Bearer $TOKEN" http://localhost:8000/reports
# → 200 с данными о протезах
```

## Верификация JWT

**API проверяет токены через:**
1. **JWKS** - получает публичные ключи от Keycloak
2. **Подпись** - проверяет цифровую подпись токена
3. **Claims** - проверяет issuer, expiration, роли
4. **Роли** - доступ только для prothetic_user

## Данные для протезов

```json
{
  "data": {
    "deviceUsage": "92%",
    "sessionsCount": 45,
    "averageSessionTime": "2.5 часа",
    "devices": [
      { "name": "Протез руки v2.1", "usage": "95%" },
      { "name": "Протез ноги v1.8", "usage": "88%" }
    ],
    "recentSessions": [
      { "date": "2024-01-15", "duration": "3.2 часа", "efficiency": "94%" }
    ]
  }
}
```

## Конфигурация Keycloak

### Frontend клиент:
```json
{
  "clientId": "reports-frontend",
  "publicClient": true,
  "attributes": {
    "pkce.code.challenge.method": "S256"
  }
}
```

### API клиент:
```json
{
  "clientId": "reports-api",
  "bearerOnly": true
}
```

##  Ключевые моменты безопасности

1. **PKCE S256** - защита от перехвата кода
2. **JWT + JWKS** - проверка подписи без секретов
3. **Bearer-only API** - только валидация токенов
4. **Роли** - доступ только для prothetic_user

## 📝 Логи для отладки

```bash
# Логи всех сервисов
docker-compose logs -f

# Логи API
docker-compose logs -f api

# Логи Keycloak
docker-compose logs -f keycloak
```

---

**Итог:** Современная безопасная система с PKCE, роле-ориентированным доступом и специализированными данными для пользователей протезов. 🦾 