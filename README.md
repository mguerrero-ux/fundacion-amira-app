# 🏛️ AMIRA AL DAHAB — Guía de Instalación

## Estructura del proyecto

```
amira/
├── index.html                        ← Frontend completo
├── netlify.toml                      ← Config Netlify
├── package.json                      ← Dependencias
├── schema.sql                        ← Base de datos Neon
└── netlify/
    └── functions/
        ├── _db.js                    ← Helper compartido
        ├── auth-login.js             ← Login con PIN
        ├── auth-register.js          ← Registro con código invitación
        ├── dashboard.js              ← Datos del panel (respeta jerarquía)
        ├── leads.js                  ← Crear leads
        ├── leads-approve.js          ← Aprobar lead → pending
        ├── pends-pay.js              ← Ejecutar pago → historial
        ├── team.js                   ← Árbol de afiliados
        └── settings.js               ← Guardar configuración
```

---

## PASO 1 — Configurar Neon (Base de datos)

1. Ve a [neon.tech](https://neon.tech) → Tu proyecto
2. Abre **SQL Editor**
3. Copia y pega todo el contenido de `schema.sql`
4. Haz clic en **Run** — esto crea todas las tablas + tu cuenta admin

> ⚠️ **IMPORTANTE:** En el schema.sql, la cuenta admin usa PIN `1234` por defecto.  
> Cambia el `pin_hash` por el hash SHA-256 de tu PIN real.  
> Puedes generar el hash en: https://emn178.github.io/online-tools/sha256.html

5. Copia la **Connection String** de Neon:
   - Ve a Dashboard → Tu proyecto → **Connection Details**
   - Copia el string que empieza con `postgresql://...`

---

## PASO 2 — Configurar Netlify

1. Sube esta carpeta a un repositorio GitHub (o GitLab)
2. Ve a [netlify.com](https://netlify.com) → **Add new site** → Import from Git
3. Selecciona tu repo → Netlify detecta automáticamente el `netlify.toml`
4. Antes de deployar, ve a **Site settings → Environment variables** y agrega:

```
DATABASE_URL = postgresql://user:pass@ep-xxx.neon.tech/neondb?sslmode=require
```

5. Haz clic en **Deploy**

---

## PASO 3 — Primer acceso

1. Abre tu sitio Netlify
2. Ingresa el PIN de tu cuenta admin (el que definiste en el schema.sql)
3. ¡Listo! Verás tu panel con el sistema completo

---

## Sistema de Afiliados

### Cómo funciona:
- **Tú** (admin) tienes el código `AMIRA-ROOT`
- Compartes ese código con alguien → esa persona se registra → queda en **nivel 1** de tu equipo
- Esa persona recibe su propio código único → puede invitar a más → quedan en **nivel 2**
- Y así sucesivamente (hasta 10 niveles)

### Visibilidad de datos:
- **Tú** (admin) ves absolutamente todo
- **Miembro nivel 1** ve sus datos + datos de todos los que él invitó (y los que ellos invitaron)
- **Miembro nivel 2** ve sus datos + datos de su subárbol
- **Nadie** puede ver datos de sus superiores

### Invitar a alguien:
1. Ve a la pestaña **Mi Equipo**
2. Comparte tu código o el link con el botón **Compartir**
3. La persona accede al link, llena su nombre, código y crea su PIN
4. Aparece en tu árbol automáticamente

---

## URLs de las Functions

| Función | URL |
|---------|-----|
| Login | `POST /.netlify/functions/auth-login` |
| Registro | `POST /.netlify/functions/auth-register` |
| Dashboard | `GET /.netlify/functions/dashboard` |
| Crear lead | `POST /.netlify/functions/leads` |
| Aprobar lead | `POST /.netlify/functions/leads-approve?id=X` |
| Ejecutar pago | `POST /.netlify/functions/pends-pay?id=X` |
| Equipo | `GET /.netlify/functions/team` |
| Settings | `POST /.netlify/functions/settings` |

---

## ¿Problemas?

- **Error de conexión:** Verifica que `DATABASE_URL` esté bien configurada en Netlify
- **PIN incorrecto al login:** Verifica que el `pin_hash` en el schema sea el SHA-256 correcto
- **Functions no responden:** Revisa los logs en Netlify → Functions → Logs
