-- CreateEnum
CREATE TYPE "RolUsuario" AS ENUM ('ADMIN', 'PROFESOR', 'STAFF', 'ALUMNO');

-- CreateEnum
CREATE TYPE "EstadoEvento" AS ENUM ('BORRADOR', 'PUBLICADO', 'EN_CURSO', 'FINALIZADO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "EstadoPago" AS ENUM ('PENDIENTE', 'PAGADO', 'EXENTO', 'RECHAZADO');

-- CreateEnum
CREATE TYPE "MetodoAsistencia" AS ENUM ('QR', 'MANUAL', 'BIOMETRICO');

-- CreateTable
CREATE TABLE "usuarios" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "rol" "RolUsuario" NOT NULL DEFAULT 'ALUMNO',
    "telefono" TEXT,
    "codigoEstudiantil" TEXT,
    "carrera" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "eventos" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "fechaInicio" TIMESTAMP(3) NOT NULL,
    "fechaFin" TIMESTAMP(3) NOT NULL,
    "ubicacion" TEXT NOT NULL,
    "capacidadMaxima" INTEGER,
    "precio" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "estado" "EstadoEvento" NOT NULL DEFAULT 'BORRADOR',
    "imagenUrl" TEXT,
    "organizadorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "eventos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inscripciones" (
    "id" TEXT NOT NULL,
    "eventoId" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "asignatura_bonificacion" TEXT,
    "profesor_responsable_dinero" TEXT,
    "profesorResponsableId" TEXT,
    "estado_pago" "EstadoPago" NOT NULL DEFAULT 'PENDIENTE',
    "montoPagado" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "comprobanteUrl" TEXT,
    "fechaInscripcion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inscripciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asistencias" (
    "id" TEXT NOT NULL,
    "inscripcionId" TEXT NOT NULL,
    "fechaHoraRegistro" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "registradoPorId" TEXT,
    "metodo" "MetodoAsistencia" NOT NULL DEFAULT 'QR',
    "observaciones" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "asistencias_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_codigoEstudiantil_key" ON "usuarios"("codigoEstudiantil");

-- CreateIndex
CREATE UNIQUE INDEX "inscripciones_eventoId_usuarioId_key" ON "inscripciones"("eventoId", "usuarioId");

-- CreateIndex
CREATE UNIQUE INDEX "asistencias_inscripcionId_key" ON "asistencias"("inscripcionId");

-- AddForeignKey
ALTER TABLE "eventos" ADD CONSTRAINT "eventos_organizadorId_fkey" FOREIGN KEY ("organizadorId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inscripciones" ADD CONSTRAINT "inscripciones_eventoId_fkey" FOREIGN KEY ("eventoId") REFERENCES "eventos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inscripciones" ADD CONSTRAINT "inscripciones_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inscripciones" ADD CONSTRAINT "inscripciones_profesorResponsableId_fkey" FOREIGN KEY ("profesorResponsableId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asistencias" ADD CONSTRAINT "asistencias_inscripcionId_fkey" FOREIGN KEY ("inscripcionId") REFERENCES "inscripciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asistencias" ADD CONSTRAINT "asistencias_registradoPorId_fkey" FOREIGN KEY ("registradoPorId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
