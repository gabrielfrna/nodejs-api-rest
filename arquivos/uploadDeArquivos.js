const fs = require('fs')

fs.createReadStream('./assets/fluig.png')
    .pipe(fs.createWriteStream('./assets/fluig-stream.png'))
    .on('finish', () => console.log('Imagem foi escrita com sucesso!'))