import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { NotFoundException } from '@nestjs/common';
import { SearchService } from '../search.service';
import { Specialty } from '../../common/enums/specialty.enum';
import { SearchQueryDto } from '../dto/search-query.dto';

interface QueryMock {
  skip: jest.Mock;
  limit: jest.Mock;
  exec: jest.Mock;
}

const createQueryMock = (returnValue: unknown[]): QueryMock => ({
  skip: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  exec: jest.fn().mockResolvedValue(returnValue),
});

const clinicFixture = [
  {
    _id: 'clinic-1',
    name: 'Clinic One',
    specialties: [Specialty.CARDIOLOGY],
    address: { city: 'Porto' },
  },
  {
    _id: 'clinic-2',
    name: 'Clinic Two',
    specialties: [Specialty.DERMATOLOGY],
    address: { city: 'Lisboa' },
  },
];

const professionalFixture = [
  {
    _id: 'pro-1',
    name: 'Dr. Alice',
    specialties: [Specialty.CARDIOLOGY],
    address: { city: 'Porto' },
  },
  {
    _id: 'pro-2',
    name: 'Dr. Bob',
    specialties: [Specialty.DERMATOLOGY],
    address: { city: 'Lisboa' },
  },
];

describe('SearchService', () => {
  let service: SearchService;
  let clinicModel: { find: jest.Mock; findById: jest.Mock };
  let professionalModel: { find: jest.Mock; findById: jest.Mock };

  beforeEach(async () => {
    clinicModel = {
      find: jest.fn(),
      findById: jest.fn(),
    };
    professionalModel = {
      find: jest.fn(),
      findById: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SearchService,
        { provide: getModelToken('Clinic'), useValue: clinicModel },
        { provide: getModelToken('Professional'), useValue: professionalModel },
      ],
    }).compile();

    service = module.get<SearchService>(SearchService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('search', () => {
    it('returns all clinics and professionals with no filters', async () => {
      clinicModel.find.mockReturnValue(createQueryMock(clinicFixture));
      professionalModel.find.mockReturnValue(
        createQueryMock(professionalFixture),
      );

      const dto: SearchQueryDto = {};
      const result = await service.search(dto);

      expect(clinicModel.find).toHaveBeenCalledWith({});
      expect(professionalModel.find).toHaveBeenCalledWith({});
      expect(result.clinics).toHaveLength(clinicFixture.length);
      expect(result.professionals).toHaveLength(professionalFixture.length);
    });

    it('filters by specialty correctly', async () => {
      clinicModel.find.mockReturnValue(createQueryMock([clinicFixture[0]]));
      professionalModel.find.mockReturnValue(
        createQueryMock([professionalFixture[0]]),
      );

      const dto: SearchQueryDto = { specialty: Specialty.CARDIOLOGY };
      await service.search(dto);

      const expectedFilter = {
        specialties: { $in: [Specialty.CARDIOLOGY] },
      };
      expect(clinicModel.find).toHaveBeenCalledWith(expectedFilter);
      expect(professionalModel.find).toHaveBeenCalledWith(expectedFilter);
    });

    it('filters by city correctly', async () => {
      clinicModel.find.mockReturnValue(createQueryMock([clinicFixture[0]]));
      professionalModel.find.mockReturnValue(
        createQueryMock([professionalFixture[0]]),
      );

      const dto: SearchQueryDto = { city: 'Porto' };
      await service.search(dto);

      const expectedFilter = { 'address.city': 'Porto' };
      expect(clinicModel.find).toHaveBeenCalledWith(expectedFilter);
      expect(professionalModel.find).toHaveBeenCalledWith(expectedFilter);
    });

    it('combines specialty and city filters', async () => {
      clinicModel.find.mockReturnValue(createQueryMock([clinicFixture[0]]));
      professionalModel.find.mockReturnValue(
        createQueryMock([professionalFixture[0]]),
      );

      const dto: SearchQueryDto = {
        specialty: Specialty.CARDIOLOGY,
        city: 'Porto',
      };
      await service.search(dto);

      const expectedFilter = {
        specialties: { $in: [Specialty.CARDIOLOGY] },
        'address.city': 'Porto',
      };
      expect(clinicModel.find).toHaveBeenCalledWith(expectedFilter);
      expect(professionalModel.find).toHaveBeenCalledWith(expectedFilter);
    });

    it('returns only clinics when type=clinic', async () => {
      clinicModel.find.mockReturnValue(createQueryMock(clinicFixture));

      const dto: SearchQueryDto = { type: 'clinic' };
      const result = await service.search(dto);

      expect(clinicModel.find).toHaveBeenCalled();
      expect(professionalModel.find).not.toHaveBeenCalled();
      expect(result.clinics).toHaveLength(clinicFixture.length);
      expect(result.professionals).toEqual([]);
    });

    it('returns only professionals when type=professional', async () => {
      professionalModel.find.mockReturnValue(
        createQueryMock(professionalFixture),
      );

      const dto: SearchQueryDto = { type: 'professional' };
      const result = await service.search(dto);

      expect(professionalModel.find).toHaveBeenCalled();
      expect(clinicModel.find).not.toHaveBeenCalled();
      expect(result.professionals).toHaveLength(professionalFixture.length);
      expect(result.clinics).toEqual([]);
    });

    it('respects pagination (page=2, limit=10 -> skip=10)', async () => {
      const clinicQuery = createQueryMock(clinicFixture);
      const professionalQuery = createQueryMock(professionalFixture);
      clinicModel.find.mockReturnValue(clinicQuery);
      professionalModel.find.mockReturnValue(professionalQuery);

      const dto: SearchQueryDto = { page: 2, limit: 10 };
      await service.search(dto);

      expect(clinicQuery.skip).toHaveBeenCalledWith(10);
      expect(clinicQuery.limit).toHaveBeenCalledWith(10);
      expect(professionalQuery.skip).toHaveBeenCalledWith(10);
      expect(professionalQuery.limit).toHaveBeenCalledWith(10);
    });
  });

  describe('findClinicById', () => {
    it('returns the clinic when found', async () => {
      clinicModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(clinicFixture[0]),
      });

      const result = await service.findClinicById('clinic-1');

      expect(clinicModel.findById).toHaveBeenCalledWith('clinic-1');
      expect(result).toEqual(clinicFixture[0]);
    });

    it('throws NotFoundException when clinic not found', async () => {
      clinicModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(service.findClinicById('missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findProfessionalById', () => {
    it('returns the professional when found', async () => {
      professionalModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(professionalFixture[0]),
      });

      const result = await service.findProfessionalById('pro-1');

      expect(professionalModel.findById).toHaveBeenCalledWith('pro-1');
      expect(result).toEqual(professionalFixture[0]);
    });

    it('throws NotFoundException when professional not found', async () => {
      professionalModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(service.findProfessionalById('missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
