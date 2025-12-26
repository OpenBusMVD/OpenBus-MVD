FROM php:8.2-apache

# Argumentos de build
ARG URL_SERVER=""
ARG CORS_ORIGIN="http://localhost:8080"

# Instalar extensiones de PHP necesarias
RUN apt-get update && apt-get install -y \
    libsqlite3-dev \
    && docker-php-ext-install pdo pdo_sqlite \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Habilitar mod_rewrite y headers para Apache
RUN a2enmod rewrite headers

# Copiar configuración personalizada de Apache
COPY apache/apache2.conf /etc/apache2/apache2.conf
COPY apache/000-default.conf /etc/apache2/sites-available/000-default.conf

# Copiar archivos del proyecto al directorio de Apache
COPY . /var/www/html/

# Generar archivo de configuración JavaScript
RUN echo "// Configuración generada durante el build de Docker" > /var/www/html/js/config.js && \
    echo "window.CONFIG = {" >> /var/www/html/js/config.js && \
    echo "    urlServer: \"${URL_SERVER}\"," >> /var/www/html/js/config.js && \
    echo "    corsOrigin: \"${CORS_ORIGIN}\"" >> /var/www/html/js/config.js && \
    echo "};" >> /var/www/html/js/config.js

# Establecer permisos correctos
RUN chown -R www-data:www-data /var/www/html \
    && chmod -R 755 /var/www/html

# Exponer puerto 80
EXPOSE 80

# Variables de entorno disponibles en runtime
ENV CORS_ORIGIN=${CORS_ORIGIN}
ENV URL_SERVER=${URL_SERVER}

# Comando por defecto
CMD ["apache2-foreground"]
