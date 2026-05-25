import { VariableExtractorService } from './variable-extractor.service';

describe('VariableExtractorService', () => {
  let service: VariableExtractorService;

  beforeEach(() => {
    service = new VariableExtractorService();
  });

  it('extracts variables from text in first-seen order', () => {
    const variables = service.extractVariablesFromText(
      '甲方：{{甲方公司名称}} 金额：{{合同金额}} 日期：{{签订日期}}',
    );

    expect(variables).toEqual(['甲方公司名称', '合同金额', '签订日期']);
  });

  it('deduplicates repeated variables', () => {
    const variables = service.extractVariablesFromText('{{合同金额}} {{合同金额}} {{甲方公司名称}}');

    expect(variables).toEqual(['合同金额', '甲方公司名称']);
  });

  it('ignores invalid variable names', () => {
    const variables = service.extractVariablesFromText('{{a}} {{变量-名称}} {{合法变量}}');

    expect(variables).toEqual(['合法变量']);
  });

  it('returns an empty array when no variables exist', () => {
    expect(service.extractVariablesFromText('这是一份没有占位符的合同')).toEqual([]);
  });
});
