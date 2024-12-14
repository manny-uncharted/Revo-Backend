# Usa una imagen base de Node.js
FROM node:16-alpine

# Establece el directorio de trabajo dentro del contenedor
WORKDIR /usr/src/app

# Copia los archivos de package.json y package-lock.json
COPY package*.json ./

# Instala las dependencias
RUN npm install

# Instala el CLI de NestJS globalmente
RUN npm install -g @nestjs/cli

# Copia el resto del proyecto al contenedor
COPY . .

# Expone el puerto de la aplicación
EXPOSE 3000

# Comando por defecto para iniciar la aplicación
CMD ["npm", "run", "start:dev"]
