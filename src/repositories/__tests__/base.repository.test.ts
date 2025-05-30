import { BaseRepository } from '../base.repository';
import { PrismaClient } from '@prisma/client';

describe('BaseRepository', () => {
  class TestRepository extends BaseRepository<any, any, any> {
    constructor(prisma: PrismaClient) {
      super(prisma, 'testModel' as any);
    }
  }

  let repo: TestRepository;
  let prisma: any;
  let model: any;

  beforeEach(() => {
    model = {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    };
    prisma = { testModel: model, $transaction: jest.fn(cb => cb(prisma)) };
    repo = new TestRepository(prisma);
  });

  it('findOne should call findUnique', async () => {
    model.findUnique.mockResolvedValue({ id: '1' });
    const result = await repo.findOne('1');
    expect(model.findUnique).toHaveBeenCalledWith({ where: { id: '1' } });
    expect(result).toEqual({ id: '1' });
  });

  it('findMany should call findMany', async () => {
    model.findMany.mockResolvedValue([{ id: '1' }]);
    const filter = { where: { foo: 'bar' }, orderBy: {}, skip: 0, take: 10 };
    const result = await repo.findMany(filter);
    expect(model.findMany).toHaveBeenCalledWith(filter);
    expect(result).toEqual([{ id: '1' }]);
  });

  it('create should call create', async () => {
    model.create.mockResolvedValue({ id: '1' });
    const result = await repo.create({ foo: 'bar' });
    expect(model.create).toHaveBeenCalledWith({ data: { foo: 'bar' } });
    expect(result).toEqual({ id: '1' });
  });

  it('update should call update', async () => {
    model.update.mockResolvedValue({ id: '1', foo: 'baz' });
    const result = await repo.update('1', { foo: 'baz' });
    expect(model.update).toHaveBeenCalledWith({ where: { id: '1' }, data: { foo: 'baz' } });
    expect(result).toEqual({ id: '1', foo: 'baz' });
  });

  it('delete should call delete', async () => {
    model.delete.mockResolvedValue({});
    await repo.delete('1');
    expect(model.delete).toHaveBeenCalledWith({ where: { id: '1' } });
  });

  it('count should call count', async () => {
    model.count.mockResolvedValue(5);
    const result = await repo.count({ foo: 'bar' });
    expect(model.count).toHaveBeenCalledWith({ where: { foo: 'bar' } });
    expect(result).toBe(5);
  });

  it('transaction should call $transaction', async () => {
    const cb = jest.fn().mockResolvedValue('ok');
    prisma.$transaction = jest.fn(fn => fn(prisma));
    const result = await repo['transaction'](cb);
    expect(cb).toHaveBeenCalledWith(prisma);
    expect(result).toBe('ok');
  });
});
