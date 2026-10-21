import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { ApiError } from '../../core/errors/api-error';
import { AuthSession } from '../../core/models/auth.model';
import { AuthService } from '../../core/services/auth.service';
import { LoginComponent } from './login.component';

const TIMEOUT_MESSAGE =
  'Server tidak merespons dalam 5 detik. Periksa kembali User Server yang Anda masukkan.';

const SESSION: AuthSession = {
  token: 'token-123',
  user: {
    id: 'admin',
    name: 'Admin',
    jabatanName: 'Big Boss',
    branchName: 'CABANG PUSAT',
  },
};

describe('LoginComponent', () => {
  let fixture: ComponentFixture<LoginComponent>;
  let login: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    login = vi.fn(() => throwError(() => new ApiError('timeout', 0, TIMEOUT_MESSAGE)));

    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [provideRouter([]), { provide: AuthService, useValue: { login } }],
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    fixture.detectChanges();
  });

  function submit(userServer: string, userId: string, userPassword: string): void {
    fixture.componentInstance.form.setValue({ userServer, userId, userPassword });
    fixture.componentInstance.onSubmit();
    fixture.detectChanges();
  }

  it('shows the timeout error and lets the user try again when the user server is unknown', () => {
    submit('salahserver', 'admin', 'admin');

    expect(login).toHaveBeenCalledWith({
      userServer: 'salahserver',
      userId: 'admin',
      userPassword: 'admin',
    });
    expect(fixture.componentInstance.submitting()).toBe(false);
    expect(fixture.componentInstance.errorMessage()).toBe(TIMEOUT_MESSAGE);

    const alert = fixture.nativeElement.querySelector('.alert__text') as HTMLElement | null;
    expect(alert?.textContent).toContain(TIMEOUT_MESSAGE);

    const button = fixture.nativeElement.querySelector(
      'button[type="submit"]',
    ) as HTMLButtonElement;
    expect(button.disabled).toBe(false);
    expect(button.textContent).toContain('Login');
  });

  it('does not call the API and shows field errors when the form is empty', () => {
    submit('', '', '');

    expect(login).not.toHaveBeenCalled();

    const errors = [...fixture.nativeElement.querySelectorAll('.field__error')].map(
      (node: Element) => node.textContent?.trim(),
    );
    expect(errors).toEqual([
      'Kolom ini wajib diisi.',
      'Kolom ini wajib diisi.',
      'Kolom ini wajib diisi.',
    ]);
  });

  it('trims the user server and user id before calling the API', () => {
    submit('  cooluruz  ', '  admin  ', 'admin');

    expect(login).toHaveBeenCalledWith({
      userServer: 'cooluruz',
      userId: 'admin',
      userPassword: 'admin',
    });
  });

  it('navigates to the dashboard after a successful login', () => {
    login.mockReturnValue(of(SESSION));
    const router = TestBed.inject(Router);
    const navigate = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);

    submit('cooluruz', 'admin', 'admin');

    expect(navigate).toHaveBeenCalledWith('/dashboard');
  });
});
