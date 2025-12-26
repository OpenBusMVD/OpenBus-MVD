# Iniciar proyecto con Docker

Guía completa para ejecutar OpenBus MVD con Docker. Para esto, vas a necesitar tener [Docker Desktop instalado](https://www.docker.com/products/docker-desktop/) (Incluyendo Docker compose).

---

## Inicio Rápido

```bash
# 1. Configurar variables
cp .env.example .env

# 2. Iniciar con hot reload (recomendado para desarrollo)
docker compose watch
```

Si el comando terminó de forma exitosa, finaliza con lo siguiente:

```bash
// Output de la ejecución de los pasos definidos en el Dockerfile ...
 => => naming to docker.io/library/openbus-mvd-openbus-mvd                              0.0s
 => resolving provenance for metadata file                                              0.0s
[+] Running 2/2
 ✔ openbus-mvd-openbus-mvd  Built                                                       0.0s 
 ✔ Container openbus-mvd    Started                                                     1.4s 
Watch enabled  <--  El comando queda escuchando los cambios que se hagan dentro del directorio
```

Una vez que el comando retorne "Watch enabled", podremos realizar cambios en el proyecto y verlos reflejados en **http://localhost:8080**

---

## Configuración

### Variables de entorno

Copia y edita el archivo de configuración:

```bash
cp .env.example .env
```

#### Variables disponibles

| Variable        | Descripción                 | Desarrollo                 | Producción                                        |
| --------------- | ---------------------------- | -------------------------- | -------------------------------------------------- |
| `CORS_ORIGIN` | Origen permitido para CORS   | `http://localhost:8080`  | `https://openbusmvd.github.io`                   |
| `URL_SERVER`  | URL del servidor API externo | `` (vacío = APIs locales) | `https://gdsongverifier.alwaysdata.net/openbus/` |

**Ejemplo desarrollo:**

```bash
CORS_ORIGIN=http://localhost:8080
URL_SERVER=
```

**Ejemplo producción:**

```bash
CORS_ORIGIN=https://openbusmvd.github.io
URL_SERVER=https://gdsongverifier.alwaysdata.net/openbus/
```

> ⚠️ **Importante**: Las variables se configuran en **build-time**, no runtime. Requieren rebuild para aplicar cambios.

---

## Uso

### Opción 1: Docker Compose (Recomendado)

#### Desarrollo con hot reload

```bash
docker compose watch
```

Sincroniza automáticamente los cambios sin reiniciar el contenedor.

#### Iniciar en segundo plano

```bash
docker-compose up -d
```

#### Reconstruir (necesario al cambiar variables)

```bash
docker-compose up -d --build
```

#### Detener

```bash
docker-compose down
```

#### Ver logs

```bash
docker-compose logs -f
```

### Opción 2: Docker CLI

#### Construir imagen

```bash
docker build \
  --build-arg CORS_ORIGIN=http://localhost:8080 \
  --build-arg URL_SERVER= \
  -t openbus-mvd .
```

#### Ejecutar contenedor (desarrollo)

```bash
docker run -d \
  --name openbus-mvd \
  -p 8080:80 \
  -e TZ=America/Montevideo \
  openbus-mvd
```

#### Ejecutar contenedor (producción)

```bash
docker build \
  --build-arg CORS_ORIGIN=https://openbusmvd.github.io \
  --build-arg URL_SERVER=https://gdsongverifier.alwaysdata.net/openbus/ \
  -t openbus-mvd .

docker run -d \
  --name openbus-mvd \
  -p 8080:80 \
  -e TZ=America/Montevideo \
  openbus-mvd
```

#### Detener y eliminar

```bash
docker stop openbus-mvd
docker rm openbus-mvd
```

#### Ver logs

```bash
docker logs -f openbus-mvd
```

---

## Comandos Comunes

| Acción                   | Comando                                  |
| ------------------------- | ---------------------------------------- |
| Desarrollo con hot reload | `docker compose watch`                 |
| Iniciar                   | `docker-compose up -d`                 |
| Detener                   | `docker-compose down`                  |
| Reconstruir               | `docker-compose up -d --build`         |
| Ver logs                  | `docker-compose logs -f`               |
| Acceder al contenedor     | `docker-compose exec openbus-mvd bash` |
| Ver estado                | `docker-compose ps`                    |

---

## Personalización

### Cambiar puerto

Edita `docker-compose.yml`:

```yaml
ports:
  - "3000:80"  # Cambia 8080 por el puerto deseado
```

### Personalizar Apache

Los archivos de configuración están en `apache/`:

- **`apache/apache2.conf`**: Configuración principal

  - Directivas globales (timeout, keep-alive)
  - `AllowOverride All` para usar `.htaccess`
  - Formatos de log
- **`apache/000-default.conf`**: VirtualHost por defecto

  - DocumentRoot: `/var/www/html`
  - Permisos del directorio
  - Logs

**Después de editar:**

```bash
docker-compose down
docker-compose up -d --build
```

Ver más detalles en `apache/README.md`

### Variables de entorno para diferentes ambientes

Puedes crear múltiples archivos de configuración:

```bash
# .env.dev
CORS_ORIGIN=http://localhost:8080
URL_SERVER=

# .env.prod
CORS_ORIGIN=https://openbusmvd.github.io
URL_SERVER=https://gdsongverifier.alwaysdata.net/openbus/
```

Luego usar:

```bash
# Desarrollo
cp .env.dev .env && docker-compose up -d --build

# Producción
cp .env.prod .env && docker-compose up -d --build
```

O sobrescribir directamente:

```bash
CORS_ORIGIN=https://example.com URL_SERVER=https://api.example.com/ docker-compose up -d --build
```

---

## Troubleshooting

**Síntoma:** Error al ejecutar `docker-compose up`

**Solución:** Verifica que el puerto 8080 no esté en uso:

```bash
lsof -i :8080
```

Si está en uso, cambia el puerto en `docker-compose.yml` o detén el proceso que lo usa.

### Puerto en uso

```bash
# Opción 1: Cambiar puerto en docker-compose.yml
ports:
  - "3000:80"

# Opción 2: Detener el servicio que usa el puerto
kill -9 $(lsof -t -i:8080)
```

### Cambios en `.env` no se aplican

**Causa:** Las variables son build-time arguments, no runtime environment variables.

**Solución:** Reconstruir la imagen:

```bash
docker-compose down
docker-compose up -d --build
```

### Problemas de permisos

```bash
docker-compose exec openbus-mvd chown -R www-data:www-data /var/www/html
docker-compose exec openbus-mvd chmod -R 755 /var/www/html
```

### El watch no detecta cambios

**Causa:** Conflicto con volúmenes bind mount.

**Solución:** El `docker-compose.yml` actual usa watch sin volúmenes, así que esto no debería pasar. Si ocurre, reinicia:

```bash
docker-compose down
docker compose watch
```

### Logs de errores PHP

```bash
# Ver logs en tiempo real
docker-compose logs -f

# Ver solo errores de Apache
docker-compose exec openbus-mvd tail -f /var/log/apache2/error.log
```

---

## Referencia Técnica

### Stack tecnológico

- **Base**: `php:8.2-apache`
- **Extensiones PHP**: PDO, PDO SQLite
- **Módulos Apache**: mod_rewrite, mod_headers
- **Puerto**: 8080 (host) → 80 (contenedor)
- **Zona horaria**: America/Montevideo

### Archivos generados durante el build

El Dockerfile genera automáticamente:

1. **`js/config.js`**: Configuración JavaScript con `urlServer` y `corsOrigin`
2. **`config.php`**: Constantes PHP con `CORS_ORIGIN` y `URL_SERVER`

Estos archivos **NO** deben versionarse (están en `.gitignore`).

### Build args vs ENV vars

- **Build args** (`ARG`): Se usan durante la construcción de la imagen

  - `URL_SERVER`
  - `CORS_ORIGIN`
- **ENV vars** (`ENV`): Se usan durante la ejecución del contenedor

  - `TZ` (timezone)

### Arquitectura del contenedor

```
┌─────────────────────────────────────┐
│   Host (localhost:8080)             │
└───────────────┬─────────────────────┘
                │
                ▼
┌─────────────────────────────────────┐
│   Container (port 80)               │
│                                     │
│   ┌─────────────────────────────┐   │
│   │   Apache 2.4                │   │
│   │   - mod_rewrite             │   │
│   │   - mod_headers             │   │
│   └─────────────────────────────┘   │
│                                     │
│   ┌─────────────────────────────┐   │
│   │   PHP 8.2                   │   │
│   │   - PDO                     │   │
│   │   - PDO SQLite              │   │
│   └─────────────────────────────┘   │
│                                     │
│   /var/www/html/                    │
│   ├── index.html                    │
│   ├── js/                           │
│   │   ├── config.js (generado)     │
│   │   └── ...                       │
│   ├── api/                          │
│   ├── config.php (generado)         │
│   └── assets/                       │
│       └── data/buses.db             │
└─────────────────────────────────────┘
```

### Modo watch

El modo watch utiliza la funcionalidad `develop.watch` de Docker Compose v2:

- **Acción**: `sync` (sincronización de archivos)
- **Path**: `./` (todo el proyecto)
- **Target**: `/var/www/html/`
- **Ignora**: archivos de git, documentación, configuración de Docker

Cambios sincronizados automáticamente:

- ✅ HTML, CSS, JavaScript
- ✅ PHP
- ✅ Archivos de datos
- ❌ Dockerfile, docker-compose.yml (requiere rebuild)

---

## Tips y Best Practices

### Para desarrollo

1. Usa siempre `docker compose watch` para desarrollo activo
2. Mantén las variables en `.env` para cambios rápidos
3. Los archivos `config.js` y `config.php` se regeneran en cada build

### Para producción

1. Crea un `.env.prod` específico
2. Usa build args explícitos para mayor claridad
3. Considera usar Docker secrets para información sensible
4. Documenta las variables de entorno usadas

### Debugging

1. Logs en vivo: `docker-compose logs -f`
2. Entrar al contenedor: `docker-compose exec openbus-mvd bash`
3. Ver configuración de Apache: `docker-compose exec openbus-mvd apache2ctl -S`
4. Verificar variables PHP: Crea `phpinfo.php` temporalmente

---

## Notas Adicionales

- El proyecto usa **SQLite** como base de datos
- Los archivos estáticos se sirven directamente por Apache
- La configuración de CORS se maneja en PHP, no en Apache
- El archivo `.htaccess` está habilitado gracias a `AllowOverride All`
