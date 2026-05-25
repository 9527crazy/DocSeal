import { VariableInferenceService } from './variable-inference.service';

describe('VariableInferenceService', () => {
  let service: VariableInferenceService;

  beforeEach(() => {
    service = new VariableInferenceService();
  });

  it.each([
    ['合同金额', 'number'],
    ['签订日期', 'date'],
    ['联系电话', 'tel'],
    ['电子邮箱', 'email'],
    ['公司地址', 'text'],
    ['甲方公司名称', 'text'],
  ] as const)('infers %s as %s', (name, expected) => {
    expect(service.inferVariableType(name)).toBe(expected);
  });

  it('returns default validation rules by variable type', () => {
    expect(service.getDefaultValidation('text')).toEqual({ required: true, maxLength: 200 });
    expect(service.getDefaultValidation('number')).toEqual({
      required: true,
      min: 0,
      max: 999999999,
    });
    expect(service.getDefaultValidation('date')).toEqual({ required: true });
    expect(service.getDefaultValidation('tel')).toMatchObject({ required: false });
    expect(service.getDefaultValidation('email')).toMatchObject({ required: false });
  });
});
