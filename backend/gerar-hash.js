// /backend/gerar-hash.js

const bcrypt = require('bcryptjs');

// O process.argv[2] pega o terceiro argumento que passamos na linha de comando.
// Ex: node gerar-hash.js senha123 <- "senha123" é o argumento.
const senhaPura = process.argv[2];

if (!senhaPura) {
    console.error('ERRO: Por favor, forneça uma senha para gerar o hash.');
    console.log('Exemplo de uso: node gerar-hash.js minhaSenhaSuperSecreta');
    process.exit(1); // Encerra o script com um código de erro.
}

const salt = bcrypt.genSaltSync(10);
const hash = bcrypt.hashSync(senhaPura, salt);

console.log(`\nSenha Pura: ${senhaPura}`);
console.log(`Hash Gerado: ${hash}`);
console.log('\nCopie o Hash Gerado e use no seu comando SQL UPDATE.');