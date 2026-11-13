import { confirmAction } from '../lib/confirm';
import { useAuth } from '../store/auth';
import { Button } from './Button';

/** Asks first, then logs out. Used on the profile and on the rider and admin placeholder screens. */
export function LogoutButton() {
  return (
    <Button
      title="Log out"
      variant="danger"
      onPress={() =>
        confirmAction({
          title: 'Log out?',
          message: 'You will need a new code to log in again.',
          confirmLabel: 'Log out',
          onConfirm: () => void useAuth.getState().logout(),
        })
      }
    />
  );
}
