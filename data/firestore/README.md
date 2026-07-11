# Datos publicos de Firestore

Este directorio contiene copias JSON versionadas de las colecciones publicas que usa MoronaBus.

Los archivos se generan con `npm run export-firestore -- <grupo>` o mediante el workflow manual **Actualizar datos publicos de Firestore**. No se deben editar manualmente.

`manifest.json` relaciona cada conjunto de datos con su archivo versionado. La aplicacion todavia no consume estos archivos durante la fase 1.
