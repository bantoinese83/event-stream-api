import { PrismaClient } from '@prisma/client';
import { IRepository, QueryFilter } from '../interfaces/database.interface';

type PrismaModelDelegate = {
  findUnique: <T = unknown>(args: { where: { id: string } }) => Promise<T | null>;
  findMany: <T = unknown>(args: {
    where?: unknown;
    orderBy?: unknown;
    skip?: number;
    take?: number;
  }) => Promise<T[]>;
  create: <T = unknown>(args: { data: unknown }) => Promise<T>;
  update: <T = unknown>(args: { where: { id: string }; data: unknown }) => Promise<T>;
  delete: (args: { where: { id: string } }) => Promise<unknown>;
  count: (args: { where: unknown }) => Promise<number>;
};

export abstract class BaseRepository<T, TCreateInput, TUpdateInput = Partial<T>>
  implements IRepository<T, TCreateInput, TUpdateInput>
{
  protected constructor(
    protected readonly prisma: PrismaClient,
    protected readonly modelName: keyof PrismaClient
  ) {}

  async findOne(id: string): Promise<T | null> {
    const model = this.prisma[this.modelName] as unknown as PrismaModelDelegate;
    const result = await model.findUnique<T>({
      where: { id },
    });
    return result;
  }

  async findMany(filter: QueryFilter<T>): Promise<T[]> {
    const model = this.prisma[this.modelName] as unknown as PrismaModelDelegate;
    const results = await model.findMany<T>({
      where: filter.where,
      orderBy: filter.orderBy,
      skip: filter.skip,
      take: filter.take,
    });
    return results;
  }

  async create(data: TCreateInput): Promise<T> {
    const model = this.prisma[this.modelName] as unknown as PrismaModelDelegate;
    const result = await model.create<T>({
      data: data as unknown,
    });
    return result;
  }

  async update(id: string, data: TUpdateInput): Promise<T> {
    const model = this.prisma[this.modelName] as unknown as PrismaModelDelegate;
    const result = await model.update<T>({
      where: { id },
      data: data as unknown,
    });
    return result;
  }

  async delete(id: string): Promise<void> {
    const model = this.prisma[this.modelName] as unknown as PrismaModelDelegate;
    await model.delete({
      where: { id },
    });
  }

  async count(filter: Partial<T>): Promise<number> {
    const model = this.prisma[this.modelName] as unknown as PrismaModelDelegate;
    return await model.count({
      where: filter,
    });
  }

  protected async transaction<R>(
    callback: (
      prisma: Omit<
        PrismaClient,
        '$on' | '$connect' | '$disconnect' | '$use' | '$transaction' | '$extends'
      >
    ) => Promise<R>
  ): Promise<R> {
    return this.prisma.$transaction(callback);
  }
}
