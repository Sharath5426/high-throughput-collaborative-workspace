import { PrismaClient, Role, Priority } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting Prisma database seeding...');

  // Create demo user
  const hashedPassword = await bcrypt.hash('password123', 10);
  
  const user = await prisma.user.upsert({
    where: { email: 'demo@workspace.com' },
    update: {},
    create: {
      email: 'demo@workspace.com',
      name: 'Senior Engineer',
      password: hashedPassword,
    },
  });

  const memberUser = await prisma.user.upsert({
    where: { email: 'alex@workspace.com' },
    update: {},
    create: {
      email: 'alex@workspace.com',
      name: 'Alex Rivera',
      password: hashedPassword,
    },
  });

  // Create workspace
  const workspace = await prisma.workspace.create({
    data: {
      name: 'Engineering Hub',
      description: 'Primary workspace for high-throughput product engineering',
      ownerId: user.id,
      members: {
        create: [
          { userId: user.id, role: Role.OWNER },
          { userId: memberUser.id, role: Role.MEMBER },
        ],
      },
    },
  });

  // Create project
  const project = await prisma.project.create({
    data: {
      name: 'Phase 1 Launch',
      description: 'Core real-time collaborative dashboard implementation',
      workspaceId: workspace.id,
    },
  });

  // Create board
  const board = await prisma.board.create({
    data: {
      name: 'Sprint Board',
      description: 'Main active sprint execution board',
      projectId: project.id,
    },
  });

  // Create standard columns
  const todoCol = await prisma.column.create({
    data: {
      name: 'TODO',
      position: 0,
      boardId: board.id,
    },
  });

  const inProgressCol = await prisma.column.create({
    data: {
      name: 'IN PROGRESS',
      position: 1,
      boardId: board.id,
    },
  });

  const doneCol = await prisma.column.create({
    data: {
      name: 'DONE',
      position: 2,
      boardId: board.id,
    },
  });

  // Create initial tasks
  await prisma.task.createMany({
    data: [
      {
        title: 'Setup PostgreSQL Prisma Schema',
        description: 'Design and validate relational tables for users, workspaces, projects, and Kanban cards.',
        priority: Priority.HIGH,
        status: 'DONE',
        position: 0,
        columnId: doneCol.id,
        assigneeId: user.id,
      },
      {
        title: 'Implement Socket.IO Real-time Events',
        description: 'Broadcast task updates to board room subscribers.',
        priority: Priority.URGENT,
        status: 'IN PROGRESS',
        position: 0,
        columnId: inProgressCol.id,
        assigneeId: user.id,
      },
      {
        title: 'Build Next.js Kanban Drag-and-Drop UI',
        description: 'Interactive columns with hello-pangea/dnd and real-time state sync.',
        priority: Priority.HIGH,
        status: 'TODO',
        position: 0,
        columnId: todoCol.id,
        assigneeId: memberUser.id,
      },
    ],
  });

  console.log('✅ Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
