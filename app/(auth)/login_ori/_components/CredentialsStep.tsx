export default function CredentialsStep() {
  return (
    <div className="space-y-4">
      <label className="block text-sm font-medium text-gray-700">
        Email
        <input type="email" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" placeholder="your@email.com" />
      </label>
      <label className="block text-sm font-medium text-gray-700">
        Password
        <input type="password" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" placeholder="••••••••" />
      </label>
    </div>
  )
}
