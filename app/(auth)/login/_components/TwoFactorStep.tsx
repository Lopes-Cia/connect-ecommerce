export default function TwoFactorStep() {
  return (
    <div className="space-y-4">
      <label className="block text-sm font-medium text-gray-700">
        2FA Code
        <input type="text" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" placeholder="000000" maxLength={6} />
      </label>
    </div>
  )
}
