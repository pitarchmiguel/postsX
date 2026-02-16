# Guía de Diagnóstico: X OAuth Error 400

## Problema
Error 400 cuando intentas conectar cuentas de X (Twitter) a través de OAuth.

## Causas Comunes

### 1. Credenciales mal configuradas en la base de datos
Las credenciales (`X_CLIENT_ID` y `X_CLIENT_SECRET`) pueden estar:
- Con comillas extras (JSON stringified doble)
- Con espacios en blanco al inicio o final
- Con caracteres invisibles
- En formato incorrecto

### 2. Client ID o Secret incorrectos
- Copiados incorrectamente desde el Developer Portal de X
- Usando OAuth 1.0a en lugar de OAuth 2.0
- App suspendida o en revisión

### 3. Callback URL mal configurado
- No coincide exactamente con lo registrado en X Developer Portal
- Falta el protocolo correcto (http vs https)
- Puerto incorrecto en desarrollo

## Pasos de Diagnóstico

### Paso 1: Verificar logs del servidor
Los cambios que hice agregan logging detallado. Revisa la consola de Next.js cuando inicies el flujo OAuth:

```bash
# En la terminal donde corre npm run dev
# Busca mensajes como:
[X OAuth] Initiating OAuth flow { ... }
```

### Paso 2: Ejecutar script de diagnóstico
Ejecuta el script para verificar las credenciales:

```bash
npx tsx scripts/fix-x-credentials.ts
```

Este script te mostrará:
- Estado actual de las credenciales
- Si tienen formato incorrecto
- Opción para limpiarlas o configurar nuevas

### Paso 3: Verificar credenciales en X Developer Portal

1. Ve a https://developer.x.com/en/portal/dashboard
2. Selecciona tu App
3. Ve a "Keys and tokens"
4. Verifica que estás usando **OAuth 2.0 Client ID y Secret** (NO OAuth 1.0a)
5. Verifica que tu app tiene permisos de:
   - Read
   - Write
   - Direct Messages (opcional)

### Paso 4: Verificar Callback URLs

1. En tu App de X Developer Portal
2. Ve a "Settings" → "User authentication settings"
3. Verifica que tengas configuradas EXACTAMENTE estas URLs:
   - Desarrollo: `http://localhost:3000/api/x/callback`
   - Producción: `https://www.postsx.xyz/api/x/callback`

**IMPORTANTE**: Las URLs deben coincidir EXACTAMENTE (case-sensitive, no trailing slash)

### Paso 5: Verificar tipo de App

1. En X Developer Portal → Settings
2. Verifica que "App Type" es **"Web App, Automated App or Bot"**
3. Verifica que OAuth 2.0 está ENABLED
4. Scopes requeridos:
   - `tweet.read`
   - `tweet.write`
   - `users.read`
   - `community.read` (opcional pero recomendado)

### Paso 6: Revisar el error exacto en el navegador

1. Abre las Developer Tools del navegador (F12)
2. Ve a la pestaña "Network"
3. Intenta conectar tu cuenta de X
4. Busca la petición a `/i/api/2/oauth2/authorize` que falló con 400
5. Haz clic en ella y revisa:
   - Headers → Request URL
   - Response → Error message

## Soluciones

### Solución 1: Limpiar y reconfigurar credenciales

**Opción A: Via Script**
```bash
npx tsx scripts/fix-x-credentials.ts
```
Elige opción 1 para configurar nuevas credenciales.

**Opción B: Via Settings UI**
1. Ve a http://localhost:3000/settings
2. Expande "Advanced Configuration (Admin)"
3. Ingresa Client ID y Client Secret
4. Guarda
5. Haz clic en "Connect with X"

**Opción C: Via Variables de Entorno**
1. Edita `.env.local`
2. Descomenta y configura:
   ```
   X_CLIENT_ID=tu_client_id_aqui
   X_CLIENT_SECRET=tu_client_secret_aqui
   ```
3. Reinicia el servidor de desarrollo

### Solución 2: Verificar formato de credenciales

Las credenciales deben ser strings planos, sin comillas adicionales:

❌ MAL (con comillas JSON):
```
"\"bkU4X2d0d3NVbUNQcVNjREE4RG86MTpjaQ\""
```

✅ BIEN:
```
bkU4X2d0d3NVbUNQcVNjREE4RG86MTpjaQ
```

### Solución 3: Crear nueva App en X Developer Portal

Si nada funciona, puede que tu app esté mal configurada:

1. Ve a https://developer.x.com/en/portal/dashboard
2. Crea una nueva App
3. Configura OAuth 2.0 con PKCE
4. Agrega las callback URLs correctas
5. Guarda las nuevas credenciales
6. Usa el script o UI para configurarlas

## Debugging Avanzado

### Ver estado completo (Admin only)

```bash
curl http://localhost:3000/api/x/debug | jq .
```

Este endpoint te mostrará:
- Configuración actual de credenciales
- Usuarios conectados
- URLs configuradas
- Pasos de troubleshooting

### Logs mejorados

Los endpoints ahora loggean:
- Cuando se inicia el flujo OAuth
- Longitud de las credenciales
- Redirect URI usado
- Errores específicos del token exchange

Revisa la consola del servidor para ver estos logs.

## Checklist Final

Antes de intentar conectar de nuevo, verifica:

- [ ] Client ID y Secret están en la base de datos o `.env.local`
- [ ] Las credenciales NO tienen comillas extras o espacios
- [ ] Son credenciales de OAuth 2.0 (no 1.0a)
- [ ] Callback URLs coinciden exactamente en X Developer Portal
- [ ] La App tiene los scopes correctos
- [ ] La App no está suspendida o en revisión
- [ ] El servidor de desarrollo está corriendo
- [ ] Has limpiado la caché del navegador

## Próximos Pasos

1. Ejecuta `npx tsx scripts/fix-x-credentials.ts`
2. Intenta conectar de nuevo
3. Revisa los logs en la consola del servidor
4. Si sigue fallando, copia el error exacto del navegador y los logs del servidor

## Notas Adicionales

- El error `api.twitter.com/1.1/onboarding/referrer.json` es un script que X carga en su página de autorización. Si falla con 400, significa que el Client ID no es válido o la app no está configurada correctamente.
- El flujo PKCE no requiere que ingreses Access Token y Refresh Token manualmente. Esos se obtienen automáticamente después de autorizar la app.
