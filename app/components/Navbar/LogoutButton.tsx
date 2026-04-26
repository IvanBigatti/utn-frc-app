'use client'

import { signOut } from '@/app/actions/auth'

export default function LogoutButton() {
  return (
    <form action={signOut}>
      <button
        type="submit"
        className="text-sm font-medium text-gray-600 hover:text-red-600 transition-colors"
      >
        Cerrar sesión
      </button>
    </form>
  )
}
