import { ClinicDocument } from '../../clinics/schemas/clinic.schema';
import { ProfessionalDocument } from '../../professionals/schemas/professional.schema';

export interface SearchResult {
  clinics: ClinicDocument[];
  professionals: ProfessionalDocument[];
  total: number;
  page: number;
  limit: number;
}
