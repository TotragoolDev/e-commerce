npm install cors helmet morgan dotenv express-rate-limit
npm install -D cross-env

npm install prisma @prisma/client pg
pm install -D prisma
npx prisma init

docker-compose up -d

npx prisma generate
npx prisma format
npx prisma db push