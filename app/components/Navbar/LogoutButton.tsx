'use client'

import { signOut } from '@/app/actions/auth'

export default function LogoutButton() {
  return (
    <form action={signOut}>
      <button
        type="submit"
        className="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 transition-colors"
      >
        Cerrar sesión
      </button>
    </form>
  )
}
