# OpenBus MVD

Alternativa open-source como página/app para el transporte público de Montevideo.

## Demo

![Demo OpenBus MVD.](https://github.com/OpenBusMVD/OpenBus-MVD/blob/main/demo.gif)

Podes verlo en vivo en: [https://openbusmvd.github.io/OpenBus-MVD/](https://openbusmvd.github.io/OpenBus-MVD/)

Al estar hosteado en un servidor gratuito, la página anda considerablemente más lenta. Solo se debe probar como una primer demo y para ver funcionalidad general.

## Funcionalidades

- Muestra todas las paradas pertenecientes al STM
- Al hacer click en las paradas muestra qué lineas pasan por ella, y los próximos 10 buses en pasar (el servicio proporcionado por la IMM está caído así que de mientras no funciona)
- Autocompletado al escribir el origen o destino
- Búsqueda de los mejores trayectos de omnibus viaje directo, y con trasbordo incluído para viajes más complejos
- Muestra recorrido de los trayectos, y al hacer click muestra información extra

## Características y diferenciales únicas

- 0 publicidad
- Privacidad total
- Al hacer de código abierto, se somete el proyecto a una constante revisión y mejora donde el foco está en mejorar la experiencia del usuario.

## Tech Stack

- Frontend: HTML, CSS, JavaScript (vanilla), [Ionic](https://github.com/ionic-team/ionic-framework)
- Backend: PHP
- Librerías JS: [Leaflet](https://github.com/Leaflet/Leaflet), [Leaflet Routing Machine](https://github.com/perliedman/leaflet-routing-machine), [Turf](https://github.com/Turfjs/turf), [proj4js](https://github.com/proj4js/proj4js)
- Hosting demo:
  - Frontend: GitHub Pages
  - API: AlwaysData

## Ejecución local

### Prerequisitos

Se necesita tener PHP instalado, como también un servidor HTTP como Apache.
Luego clonas el repo. En algunos archivos js se conecta a un servidor provisorio donde se encuentra la api hosteada. Para un mejor y más rápido desarrollo local (y para no saturar al otro servidor), se recomienda seguir los comentarios en js/globals.js y en api/get2Routes_2.php.
Finalmente abriendo index.html DESDE el servidor HTTP (no con doble click), debería funcionar todo.

### Ejecutar con Docker

Para ejecutar el proyecto sin tener que instalar las dependencias del proyecto tales como PHP o Apache, como también evitar conflictos de versiones con las instaladas en tu pc. Necesitás tener Docker instalado. Puedes iniciar el proyecto con :

```bash
$ docker-compose up -d
```

Ver más en [DOCKER.md](docs/DOCKER.md).

## Estado del proyecto

El proyecto se encuentra en fase activa de desarrollo.
La API oficial de la IMM presenta intermitencias, por lo que algunas funciones pueden no estar disponibles temporalmente.

## Contribuir

Si querés contribuir, ya sea aportando código, reportando cualquier tipo de bug, o tenés alguna recomendación/opinión, es más que bienvenido!

Si vas a reportar un bug, por favor escribí cómo llegaste a él, y si se puede adjuntar una imagen mucho mejor. Esto es para que arreglarlo pueda ser mucho más fácil.

Si tenés alguna recomendación o bien podés abrir un issue, o mandar un mail a openbusmvd@gmail.com

Si querés aportar código, dejé algunos issues que van desde errores a funciones nuevas para agregar a futuro. Agradezco si primero comentes si vas a trabajar en ese issue de forma de no hacer trabajo duplicado sin querer.
Por favor:

- Hacé un fork del repositorio
- Creá tu branch desde `development`
- Abrí el Pull Request apuntando a `development` (no a `main`)

Cualquier tipo de contribución es más que bienvenido!

## Comentarios finales

Ante cualquier duda, podés escribir al siguiente mail: openbusmvd@gmail.com
Si deseas donar para en un futuro poder mejorar el servidor, y para la eventual app en Android, podes hacerlo a [https://ko-fi.com/lucasins](https://ko-fi.com/lucasins)

## Licencia

Este proyecto se distribuye bajo licencia GNU GPL v3.0.
