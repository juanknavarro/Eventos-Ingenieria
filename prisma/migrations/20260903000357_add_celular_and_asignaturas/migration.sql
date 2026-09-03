-- AlterTable
ALTER TABLE "inscripciones" ADD COLUMN     "celular" TEXT;

-- CreateTable
CREATE TABLE "asignaturas" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "programa_academico" TEXT NOT NULL,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "asignaturas_pkey" PRIMARY KEY ("id")
);
