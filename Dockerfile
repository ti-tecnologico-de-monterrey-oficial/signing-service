# Imagen del signing-service: servicio Express que firma credenciales con las
# semillas DID de cada tenant.
#
# El contexto de build es la raíz del repositorio.
#
# Aquí no se compila nada: toda la configuración (puerto, semillas de tenant,
# niveles de log) se lee de variables de entorno en el arranque, así que la
# misma imagen sirve para cualquier ambiente y no hay --build-arg que pasar.

FROM node:22-alpine AS deps

WORKDIR /app

# Los manifiestos antes que el código, para que la capa de dependencias solo se
# reconstruya cuando cambia el lockfile.
COPY package.json package-lock.json ./

# --omit=dev: la imagen no corre pruebas ni linter, así que las
# devDependencies solo agrandarían la superficie expuesta.
# --ignore-scripts: además de cerrar la puerta a que un paquete ejecute código
# arbitrario durante la instalación, evita el `prepare` de husky, que solo
# tiene sentido en un clon de trabajo con hooks de git.
RUN npm ci --omit=dev --ignore-scripts

FROM node:22-alpine AS runtime

# tini como PID 1: reenvía SIGTERM al proceso de Node cuando Container Apps
# retira una revisión —Node no lo atiende por sí solo siendo PID 1— y recoge
# los procesos huérfanos.
RUN apk add --no-cache tini

# El puerto viaja en la imagen en lugar de quedar en la configuración del
# Container App: config.js cae a 4006 si PORT no está definido, y esa
# diferencia con el targetPort del ingress no se nota hasta que el contenedor
# está arriba y no responde.
ENV NODE_ENV=production \
    PORT=8080

WORKDIR /app

# Los archivos quedan a nombre de root y el proceso corre como node, de modo
# que la aplicación no puede reescribir su propio código.
COPY --from=deps /app/node_modules ./node_modules
COPY package.json server.js healthcheck.js ./
COPY src ./src

# El logger solo abre archivos si ERROR_LOG_FILE o LOG_ALL_FILE están
# definidos, y esas rutas son relativas al WORKDIR. El directorio se crea aquí
# y a nombre de node para que definirlas no reviente con EACCES.
RUN mkdir logs && chown node:node logs

USER node

EXPOSE 8080

ENTRYPOINT ["/sbin/tini", "--"]

CMD ["node", "server.js"]
