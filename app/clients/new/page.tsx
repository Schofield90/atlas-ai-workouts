'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { User, Mail, Target, AlertCircle, Dumbbell, Save } from 'lucide-react'
import { simpleClientService as clientService } from '@/lib/services/workout-data-simple'

const EQUIPMENT_OPTIONS = [
  'Barbell', 'Dumbbells', 'Kettlebells', 'Pull-up Bar', 'Resistance Bands',
  'Cable Machine', 'Bench', 'Squat Rack', 'TRX', 'Medicine Ball',
  'Jump Rope', 'Foam Roller', 'Treadmill', 'Rowing Machine', 'Bike'
]

export default function NewClientPage() {
  const router = useRouter()
  
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    age: '',
    sex: '',
    height_cm: '',
    weight_kg: '',
    goals: '',
    injuries: '',
    equipment: [] as string[],
    notes: ''
  })
  
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleEquipmentToggle = (item: string) => {
    setFormData(prev => ({
      ...prev,
      equipment: prev.equipment.includes(item)
        ? prev.equipment.filter(e => e !== item)
        : [...prev.equipment, item]
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.full_name) {
      setError('Name is required')
      return
    }

    setSaving(true)
    setError('')

    try {
      // Create client data for Supabase
      const clientData = {
        full_name: formData.full_name,
        email: formData.email || undefined,
        age: formData.age ? parseInt(formData.age) : undefined,
        sex: formData.sex || undefined,
        height_cm: formData.height_cm ? parseInt(formData.height_cm) : undefined,
        weight_kg: formData.weight_kg ? parseFloat(formData.weight_kg) : undefined,
        goals: formData.goals || undefined,
        injuries: formData.injuries || undefined,
        equipment: formData.equipment,
        preferences: {},
        notes: formData.notes || undefined
      }

      // Save to Supabase
      await clientService.createClient(clientData)
      console.log('✅ Client saved to Supabase cloud storage')

      // Redirect to clients page
      router.push('/clients')
    } catch (err: any) {
      console.error('Failed to create client:', err)
      setError(err.message || 'Failed to create client')
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <nav className="bg-gray-800 shadow-sm border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <a href="/dashboard" className="text-gray-400 hover:text-gray-100 mr-4">
                ← Back
              </a>
              <h1 className="text-xl font-semibold text-gray-100">Add New Client</h1>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div 
              role="alert" 
              className="p-3 bg-red-900/30 border border-red-800 text-red-400 rounded"
              aria-live="polite"
            >
              {error}
            </div>
          )}

          {/* Basic Information */}
          <fieldset className="bg-gray-800 rounded-lg shadow p-6">
            <legend className="text-lg font-semibold text-gray-100 mb-4 flex items-center">
              <User className="h-5 w-5 mr-2" />
              Basic Information
            </legend>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="full_name" className="block text-sm font-medium text-gray-300 mb-1">
                  Full Name *
                </label>
                <input
                  id="full_name"
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400"
                  required
                  aria-required="true"
                  aria-invalid={error && !formData.full_name ? 'true' : 'false'}
                />
              </div>
              
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1">
                  <Mail className="h-4 w-4 inline mr-1 text-gray-400" />
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400"
                  aria-describedby="email-hint"
                />
                <div id="email-hint" className="sr-only">Optional field for client contact information</div>
              </div>
              
              <div>
                <label htmlFor="age" className="block text-sm font-medium text-gray-300 mb-1">
                  Age
                </label>
                <input
                  id="age"
                  type="number"
                  value={formData.age}
                  onChange={(e) => setFormData({...formData, age: e.target.value})}
                  min="1"
                  max="120"
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400"
                  aria-describedby="age-hint"
                />
                <div id="age-hint" className="sr-only">Client's age in years, between 1 and 120</div>
              </div>
              
              <div>
                <label htmlFor="sex" className="block text-sm font-medium text-gray-300 mb-1">
                  Sex
                </label>
                <select
                  id="sex"
                  value={formData.sex}
                  onChange={(e) => setFormData({...formData, sex: e.target.value})}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400"
                >
                  <option value="">Select...</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
              
              <div>
                <label htmlFor="height_cm" className="block text-sm font-medium text-gray-300 mb-1">
                  Height (cm)
                </label>
                <input
                  id="height_cm"
                  type="number"
                  value={formData.height_cm}
                  onChange={(e) => setFormData({...formData, height_cm: e.target.value})}
                  min="50"
                  max="300"
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400"
                  aria-describedby="height-hint"
                />
                <div id="height-hint" className="sr-only">Height in centimeters, between 50 and 300</div>
              </div>
              
              <div>
                <label htmlFor="weight_kg" className="block text-sm font-medium text-gray-300 mb-1">
                  Weight (kg)
                </label>
                <input
                  id="weight_kg"
                  type="number"
                  value={formData.weight_kg}
                  onChange={(e) => setFormData({...formData, weight_kg: e.target.value})}
                  min="20"
                  max="500"
                  step="0.1"
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400"
                  aria-describedby="weight-hint"
                />
                <div id="weight-hint" className="sr-only">Weight in kilograms, between 20 and 500</div>
              </div>
            </div>
          </fieldset>

          {/* Goals & Limitations */}
          <fieldset className="bg-gray-800 rounded-lg shadow p-6">
            <legend className="text-lg font-semibold text-gray-100 mb-4 flex items-center">
              <Target className="h-5 w-5 mr-2" />
              Goals & Limitations
            </legend>
            
            <div className="space-y-4">
              <div>
                <label htmlFor="goals" className="block text-sm font-medium text-gray-300 mb-1">
                  Fitness Goals
                </label>
                <textarea
                  id="goals"
                  value={formData.goals}
                  onChange={(e) => setFormData({...formData, goals: e.target.value})}
                  placeholder="e.g., Build muscle, lose weight, improve endurance, get stronger..."
                  rows={3}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400"
                  aria-describedby="goals-hint"
                />
                <div id="goals-hint" className="sr-only">Describe the client's fitness objectives and what they want to achieve</div>
              </div>
              
              <div>
                <label htmlFor="injuries" className="block text-sm font-medium text-gray-300 mb-1 flex items-center">
                  <AlertCircle className="h-4 w-4 mr-1 text-orange-500" />
                  Injuries or Limitations
                </label>
                <textarea
                  id="injuries"
                  value={formData.injuries}
                  onChange={(e) => setFormData({...formData, injuries: e.target.value})}
                  placeholder="e.g., Lower back pain, knee issues, shoulder mobility limited..."
                  rows={3}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400"
                  aria-describedby="injuries-hint"
                />
                <div id="injuries-hint" className="sr-only">List any injuries, physical limitations, or medical conditions that may affect exercise selection</div>
              </div>
            </div>
          </fieldset>

          {/* Available Equipment */}
          <fieldset className="bg-gray-800 rounded-lg shadow p-6">
            <legend className="text-lg font-semibold text-gray-100 mb-4 flex items-center">
              <Dumbbell className="h-5 w-5 mr-2" />
              Available Equipment
            </legend>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3" role="group" aria-labelledby="equipment-group-label">
              <div id="equipment-group-label" className="sr-only">Select available equipment</div>
              {EQUIPMENT_OPTIONS.map((item) => (
                <label key={item} className="flex items-center space-x-2 cursor-pointer text-gray-300">
                  <input
                    type="checkbox"
                    checked={formData.equipment.includes(item)}
                    onChange={() => handleEquipmentToggle(item)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-600 rounded bg-gray-700"
                    aria-describedby="equipment-hint"
                  />
                  <span className="text-sm">{item}</span>
                </label>
              ))}
            </div>
            
            <div className="mt-4">
              <label className="flex items-center space-x-2 cursor-pointer text-gray-300">
                <input
                  type="checkbox"
                  checked={formData.equipment.includes('Bodyweight')}
                  onChange={() => handleEquipmentToggle('Bodyweight')}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-600 rounded bg-gray-700"
                  aria-describedby="equipment-hint"
                />
                <span className="text-sm font-medium">Bodyweight Only</span>
              </label>
            </div>
            <div id="equipment-hint" className="sr-only">Choose all equipment types available to this client for workout planning</div>
          </fieldset>

          {/* Additional Notes */}
          <div className="bg-gray-800 rounded-lg shadow p-6">
            <label htmlFor="notes" className="block text-lg font-semibold text-gray-100 mb-4">Additional Notes</label>
            <textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
              placeholder="Any other relevant information about the client..."
              rows={4}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400"
              aria-describedby="notes-hint"
            />
            <div id="notes-hint" className="sr-only">Optional additional information about the client that may be helpful for workout planning</div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => router.push('/dashboard')}
              className="px-4 py-2 border border-gray-600 text-gray-300 rounded-md hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed flex items-center"
            >
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Creating...' : 'Create Client'}
            </button>
          </div>
        </form>
      </main>
    </div>
  )
}