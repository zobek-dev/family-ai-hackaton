# Deploy del frontend en Vercel

IdeaLens necesita tres piezas detrás del sitio Next **en producción**:

1. **Frontend (Next.js)** → Vercel (esta guía).
2. **BFF** (`apps/bff`) → un servidor Node con proceso largo (p. ej. Railway, Render, Fly.io, VM + Docker usando `deployment/docker-compose.stack.yml`).
3. **Agente LangGraph** (Python) + **CopilotKit Intelligence** (Postgres, Redis, API + gateway WS) → el mismo Docker stack self-hosted o un proveedor gestionado (CopilotKit Intelligence en la nube, si aplica a tu proyecto).

La app llama siempre al runtime CopilotKit en **`/api/copilotkit`** (same-origin). Next **reenvía** esas rutas al BFF mediante `rewrites()` en `apps/frontend/next.config.ts`; la URL del BFF en producción es **`BFF_URL`** (solo build/servidor, no hace falta prefijo `NEXT_PUBLIC_`).

---

## 1. Desplegar backend (BFF + agente + Intelligence)

Opción recomendada para alinear con el repo: **`npm run deploy:docker`** (o el script en `deployment/scripts/deploy-docker-stack.sh`) en un host con Docker y dominio/TLS. Expón al menos el **puerto del BFF** (por defecto `4000`) con HTTPS vía reverse proxy.

Anota la URL pública del BFF, por ejemplo: `https://bff.tu-dominio.com` (sin barra final).

Variables mínimas del BFF en producción (ver `deployment/docker-compose.stack.yml` y `.env.example`):

- `COPILOTKIT_LICENSE_TOKEN`
- `LANGGRAPH_DEPLOYMENT_URL` (URL interna o pública del API del agente)
- `INTELLIGENCE_API_URL` y `INTELLIGENCE_GATEWAY_WS_URL` (tu stack Intelligence)
- `INTELLIGENCE_API_KEY` (debe coincidir con el que usa el stack Intelligence)

Tras levantar el stack, ejecuta **`npm run seed`** (o el equivalente en tu entorno) si CopilotKit Intelligence requiere el usuario sembrado para hilos (ver mensajes de error del BFF sobre `threads_user_id_fkey`).

---

## 2. Proyecto en Vercel

1. Conecta el repositorio en [Vercel](https://vercel.com).
2. **Root Directory:** déjalo vacío o en la raíz del repo; el archivo **[`vercel.json`](../vercel.json)** en la raíz define `"rootDirectory": "apps/frontend"` para que el build sea Next.js en esa carpeta.
3. **Install command:** en `vercel.json` → `cd ../.. && SKIP_INSTALL_AGENT=1 npm install` instala el monorepo sin `uv`. Se usa `npm install` (no `npm ci`) porque `package-lock.json` suele estar en `.gitignore` y Vercel no sube archivos ignorados por Git.
4. **Build command:** `next build` (por defecto del preset en `apps/frontend`).
5. **Output:** manejado por el preset Next.js.

**CLI:** ejecuta `npx vercel deploy --prod` desde la **raíz del repositorio** (no desde `apps/frontend`), para que se suba todo el monorepo.

### Variables de entorno en Vercel

| Variable | Entorno | Descripción |
|----------|---------|-------------|
| `BFF_URL` | Production (y Preview si quieres backend de preview) | URL base del BFF con `https`, p. ej. `https://bff.tu-dominio.com` |
| `NEXT_PUBLIC_COPILOT_CLOUD_PUBLIC_API_KEY` | Si la usas | Opcional; misma clave pública que en local si activas cloud en el provider |

**Importante:** `BFF_URL` debe estar definida **antes** del build, porque `next.config.ts` inyecta los `rewrites` en tiempo de compilación.

Opcional si no usáis Copilot Cloud y el resto viene del BFF:

- Si en algún momento movéis configuración sensible al cliente, documentadla aquí; hoy IdeaLens usa sobre todo `runtimeUrl="/api/copilotkit"`.

---

## 3. Previews / ramas

Cada Preview en Vercel puede apuntar a un BFF distinto si defines `BFF_URL` por entorno (Preview vs Production). Si solo tenéis un BFF, usad la misma URL en ambos o consolidad solo Production.

---

## 4. Límites y streaming

Las respuestas del agente pueden ser largas (SSE/streaming). En el plan Hobby de Vercel hay límites de tiempo en funciones/serverless; si el proxy de `/api/copilotkit` corta streams, valorad:

- Plan Pro y límites ampliados, o
- Poner delante del frontend un proxy que no sea el mismo mecanismo con límite bajo (menos habitual).

Para muchos hacks MVP, convive bien; si falla timeouts, revisad logs en Vercel y en el BFF.

---

## 5. Checklist rápido

- [ ] BFF público HTTPS y saludable (`/api/copilotkit` según rutas CopilotKit).
- [ ] Agente LangGraph alcanzable desde el BFF.
- [ ] Intelligence alcanzable desde el BFF (HTTP + WS).
- [ ] `BFF_URL` en Vercel (Production).
- [ ] Root Directory `apps/frontend`.
- [ ] Seed de usuario en Intelligence si lo requiere vuestro despliegue.

---

## 6. Desarrollo local con BFF remoto

Podés hacer `export BFF_URL=https://bff....` antes de `npm run dev --workspace frontend` para probar contra un BFF ya desplegado (recordá CORS mismo origen: en local Next sigue sirviendo en `localhost`; el navegador pega a `localhost/api/...` y Next reenvía al BFF remoto).
