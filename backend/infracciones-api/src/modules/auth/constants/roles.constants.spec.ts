import { CAPTURE_ROLES, ROLES } from './roles.constants';

describe('CAPTURE_ROLES', () => {
  it('permite capturar infracciones al rol INFRACCIONES', () => {
    expect(CAPTURE_ROLES).toContain(ROLES.INFRACCIONES);
  });
});
