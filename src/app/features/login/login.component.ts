import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { toApiError } from '../../core/errors/api-error';
import { AuthService } from '../../core/services/auth.service';
import { notBlank } from '../../core/validators/not-blank.validator';

type LoginField = 'userServer' | 'userId' | 'userPassword';

const DEFAULT_RETURN_URL = '/dashboard';

function safeReturnUrl(url: string | null): string {
  if (!url || !url.startsWith('/') || url.startsWith('//') || url.startsWith('/login')) {
    return DEFAULT_RETURN_URL;
  }
  return url;
}

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly returnUrl = safeReturnUrl(inject(ActivatedRoute).snapshot.queryParamMap.get('returnUrl'));

  readonly form = this.fb.group({
    userServer: this.fb.control('', [Validators.required, notBlank, Validators.maxLength(50)]),
    userId: this.fb.control('', [Validators.required, notBlank, Validators.maxLength(50)]),
    userPassword: this.fb.control('', [Validators.required]),
  });

  readonly submitting = signal(false);
  readonly submitted = signal(false);
  readonly showPassword = signal(false);
  readonly errorMessage = signal<string | null>(null);

  constructor() {
    this.form.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.errorMessage.set(null));
  }

  onSubmit(): void {
    this.submitted.set(true);

    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }

    const { userServer, userId, userPassword } = this.form.getRawValue();

    this.errorMessage.set(null);
    this.submitting.set(true);

    this.auth
      .login({
        userServer: userServer.trim(),
        userId: userId.trim(),
        userPassword,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => void this.router.navigateByUrl(this.returnUrl),
        error: (error: unknown) => {
          this.errorMessage.set(toApiError(error).message);
          this.submitting.set(false);
        },
      });
  }

  togglePassword(): void {
    this.showPassword.update((visible) => !visible);
  }

  showError(field: LoginField): boolean {
    const control = this.form.controls[field];
    return control.invalid && (control.touched || this.submitted());
  }

  fieldError(field: LoginField): string {
    const errors = this.form.controls[field].errors ?? {};
    if (errors['required']) {
      return 'Kolom ini wajib diisi.';
    }
    if (errors['blank']) {
      return 'Tidak boleh hanya berisi spasi.';
    }
    if (errors['maxlength']) {
      return 'Maksimal 50 karakter.';
    }
    return 'Nilai tidak valid.';
  }
}
