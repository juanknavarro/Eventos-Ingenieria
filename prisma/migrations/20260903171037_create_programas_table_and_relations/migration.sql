-- AlterTable
ALTER TABLE "asignaturas" ADD COLUMN     "programaId" TEXT;

-- AlterTable
ALTER TABLE "eventos" ADD COLUMN     "programaId" TEXT;

-- AlterTable
ALTER TABLE "usuarios" ADD COLUMN     "programaId" TEXT;

-- CreateTable
CREATE TABLE "programas" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "estado_activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "programas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "programas_nombre_key" ON "programas"("nombre");

-- AddForeignKey
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_programaId_fkey" FOREIGN KEY ("programaId") REFERENCES "programas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eventos" ADD CONSTRAINT "eventos_programaId_fkey" FOREIGN KEY ("programaId") REFERENCES "programas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asignaturas" ADD CONSTRAINT "asignaturas_programaId_fkey" FOREIGN KEY ("programaId") REFERENCES "programas"("id") ON DELETE SET NULL ON UPDATE CASCADE;
