import { PrismaClient, RolUsuario, EstadoEvento, EstadoPago, MetodoAsistencia } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🧹 Limpiando base de datos...')
  await prisma.asistencia.deleteMany()
  await prisma.inscripcion.deleteMany()
  await prisma.evento.deleteMany()
  await prisma.usuario.deleteMany()

  console.log('👤 Creando usuarios con los diferentes roles requeridos...')

  // Generar hashes seguros para contraseñas predeterminadas
  const passAdminHash = await bcrypt.hash('AdminSinu2026*', 10)
  const passProfesorHash = await bcrypt.hash('Profesor2026*', 10)
  const passStaffHash = await bcrypt.hash('Staff2026*', 10)
  const passAlumnoHash = await bcrypt.hash('Alumno2026*', 10)

  // 1. ADMIN ÚNICO: Juan Carlos Navarro Ramos
  const admin = await prisma.usuario.create({
    data: {
      nombre: 'Juan Carlos Navarro Ramos',
      email: 'juannavarro@unisinu.edu.co',
      passwordHash: passAdminHash,
      rol: RolUsuario.ADMIN,
      telefono: '+57 300 888 9900',
      codigoEstudiantil: 'ADM-202601',
      cedula: '1047483921',
      carrera: 'Decanatura de Ingenierías',
    },
  })

  // 2. PROFESORES
  const profesor1 = await prisma.usuario.create({
    data: {
      nombre: 'Dr. Carlos Mendoza',
      email: 'carlos.mendoza@unisinu.edu.co',
      passwordHash: passProfesorHash,
      rol: RolUsuario.PROFESOR,
      telefono: '+57 310 987 6543',
      codigoEstudiantil: 'DOC-883492',
      cedula: '73123456',
      carrera: 'Ingeniería de Sistemas',
    },
  })

  const profesor2 = await prisma.usuario.create({
    data: {
      nombre: 'Dra. Elena Rojas',
      email: 'elena.rojas@unisinu.edu.co',
      passwordHash: passProfesorHash,
      rol: RolUsuario.PROFESOR,
      telefono: '+57 311 555 4321',
      codigoEstudiantil: 'DOC-772910',
      cedula: '45987654',
      carrera: 'Ingeniería Industrial',
    },
  })

  // 3. STAFF
  const staff = await prisma.usuario.create({
    data: {
      nombre: 'Valeria Martínez',
      email: 'staff.eventos@unisinu.edu.co',
      passwordHash: passStaffHash,
      rol: RolUsuario.STAFF,
      telefono: '+57 320 444 8899',
      codigoEstudiantil: 'STF-102938',
      cedula: '1143892011',
      carrera: 'Ingeniería de Sistemas',
    },
  })

  // 4. ALUMNOS
  const alumno1 = await prisma.usuario.create({
    data: {
      nombre: 'Mateo Morales Silva',
      email: 'mateo.morales@unisinu.edu.co',
      passwordHash: passAlumnoHash,
      rol: RolUsuario.ALUMNO,
      telefono: '+57 301 111 2233',
      cedula: '1047892341',
      codigoEstudiantil: '20221015001',
      carrera: 'Ingeniería de Sistemas',
      semestre: '8vo Semestre',
    },
  })

  const alumno2 = await prisma.usuario.create({
    data: {
      nombre: 'Sofía Castaño Peña',
      email: 'sofia.castano@unisinu.edu.co',
      passwordHash: passAlumnoHash,
      rol: RolUsuario.ALUMNO,
      telefono: '+57 302 333 4455',
      cedula: '1049988776',
      codigoEstudiantil: '20231015042',
      carrera: 'Ingeniería Industrial',
      semestre: '6to Semestre',
    },
  })

  const alumno3 = await prisma.usuario.create({
    data: {
      nombre: 'Lucas David Herrera',
      email: 'lucas.herrera@unisinu.edu.co',
      passwordHash: passAlumnoHash,
      rol: RolUsuario.ALUMNO,
      telefono: '+57 303 666 7788',
      cedula: '1043322110',
      codigoEstudiantil: '20212015099',
      carrera: 'Ingeniería Civil',
      semestre: '10mo Semestre',
    },
  })

  console.log('📅 Creando eventos de la facultad...')

  // Evento 1
  const evento1 = await prisma.evento.create({
    data: {
      titulo: 'Congreso Internacional de IA y Software 2026',
      descripcion: 'Conferencias magistrales con expertos de la industria sobre Inteligencia Artificial Generativa, MLOps y Arquitecturas Cloud nativas.',
      fechaInicio: new Date('2026-10-15T08:00:00Z'),
      fechaFin: new Date('2026-10-16T18:00:00Z'),
      ubicacion: 'Auditorio Principal - Campus Universitario',
      capacidadMaxima: 250,
      precio: 50000.0,
      estado: EstadoEvento.PUBLICADO,
      imagenUrl: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&auto=format&fit=crop&q=60',
      logo_fondo_url: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800&auto=format&fit=crop&q=60',
      logo_universidad_url: '/imagen_2.png',
      imagen_central_url: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=800&auto=format&fit=crop&q=60',
      sponsors_url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=60',
      organizadorId: profesor1.id,
    },
  })

  // Evento 2
  const evento2 = await prisma.evento.create({
    data: {
      titulo: 'Workshop Práctico: Cloud Computing y DevOps en AWS',
      descripcion: 'Taller hands-on de contenedores, Kubernetes y despliegue continuo de microservicios con créditos AWS incluidos.',
      fechaInicio: new Date('2026-11-05T14:00:00Z'),
      fechaFin: new Date('2026-11-05T19:00:00Z'),
      ubicacion: 'Laboratorio de Cómputo Especializado L-302',
      capacidadMaxima: 40,
      precio: 35000.0,
      estado: EstadoEvento.PUBLICADO,
      imagenUrl: 'https://images.unsplash.com/photo-1515187029135-18ee286d815b?w=800&auto=format&fit=crop&q=60',
      logo_fondo_url: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800&auto=format&fit=crop&q=60',
      logo_universidad_url: '/imagen_2.png',
      imagen_central_url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&auto=format&fit=crop&q=60',
      sponsors_url: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=800&auto=format&fit=crop&q=60',
      organizadorId: profesor1.id,
    },
  })

  // Evento 3
  const evento3 = await prisma.evento.create({
    data: {
      titulo: 'Hackathon de Innovación y Ciberseguridad 2026',
      descripcion: 'Competencia 24 horas de resolución de retos en seguridad ofensiva, criptografía y desarrollo seguro.',
      fechaInicio: new Date('2026-11-20T08:00:00Z'),
      fechaFin: new Date('2026-11-21T09:00:00Z'),
      ubicacion: 'Centro de Innovación y Emprendimiento',
      capacidadMaxima: 80,
      precio: 0.0,
      estado: EstadoEvento.PUBLICADO,
      imagenUrl: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=800&auto=format&fit=crop&q=60',
      logo_fondo_url: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=800&auto=format&fit=crop&q=60',
      logo_universidad_url: '/imagen_2.png',
      imagen_central_url: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800&auto=format&fit=crop&q=60',
      sponsors_url: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=800&auto=format&fit=crop&q=60',
      organizadorId: admin.id,
    },
  })

  console.log('📝 Creando inscripciones con campos de bonificación y recaudación...')

  // Inscripción 1: Pagada con bonificación académica y profesor recaudador
  const inscripcion1 = await prisma.inscripcion.create({
    data: {
      eventoId: evento1.id,
      usuarioId: alumno1.id,
      asignatura_bonificacion: 'Ingeniería de Software II',
      profesor_responsable_dinero: 'Dr. Carlos Mendoza',
      profesorResponsableId: profesor1.id,
      estado_pago: EstadoPago.PAGADO,
      montoPagado: 50000.0,
      comprobanteUrl: 'https://cdn.facultad.edu.co/recibos/REC-2026-001.pdf',
      fechaInscripcion: new Date('2026-09-01T10:00:00Z'),
    },
  })

  // Inscripción 2: Pendiente de pago
  const inscripcion2 = await prisma.inscripcion.create({
    data: {
      eventoId: evento1.id,
      usuarioId: alumno2.id,
      asignatura_bonificacion: 'Optimización de Procesos',
      profesor_responsable_dinero: 'Dra. Elena Rojas',
      profesorResponsableId: profesor2.id,
      estado_pago: EstadoPago.PENDIENTE,
      montoPagado: 0.0,
      fechaInscripcion: new Date('2026-09-01T11:15:00Z'),
    },
  })

  // Inscripción 3: Exenta (becado / monitor)
  const inscripcion3 = await prisma.inscripcion.create({
    data: {
      eventoId: evento2.id,
      usuarioId: alumno3.id,
      asignatura_bonificacion: 'Estructuras Hidráulicas',
      profesor_responsable_dinero: 'Dr. Carlos Mendoza',
      profesorResponsableId: profesor1.id,
      estado_pago: EstadoPago.EXENTO,
      montoPagado: 0.0,
      fechaInscripcion: new Date('2026-09-01T11:30:00Z'),
    },
  })

  // Inscripción 4: Evento Gratuito
  const inscripcion4 = await prisma.inscripcion.create({
    data: {
      eventoId: evento3.id,
      usuarioId: alumno1.id,
      asignatura_bonificacion: 'Seguridad Informática y Redes',
      profesor_responsable_dinero: 'Ing. Roberto Gómez (Decanatura)',
      profesorResponsableId: admin.id,
      estado_pago: EstadoPago.EXENTO,
      montoPagado: 0.0,
      fechaInscripcion: new Date('2026-09-01T11:40:00Z'),
    },
  })

  console.log('✅ Creando registros de asistencia...')

  // Asistencia 1: Check-in mediante QR realizado por STAFF
  await prisma.asistencia.create({
    data: {
      inscripcionId: inscripcion1.id,
      registradoPorId: staff.id,
      metodo: MetodoAsistencia.QR,
      observaciones: 'Ingreso confirmado en puerta principal - Kit de bienvenida entregado',
      fechaHoraRegistro: new Date('2026-10-15T08:12:30Z'),
    },
  })

  // Asistencia 2: Check-in en Hackathon
  await prisma.asistencia.create({
    data: {
      inscripcionId: inscripcion4.id,
      registradoPorId: staff.id,
      metodo: MetodoAsistencia.QR,
      observaciones: 'Acreditación y asignación de mesa de trabajo completada',
      fechaHoraRegistro: new Date('2026-11-20T08:05:10Z'),
    },
  })

  console.log('🎉 Seed completado exitosamente con todos los roles, eventos, inscripciones y asistencias.')
}

main()
  .catch((e) => {
    console.error('Error durante la ejecución del seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

