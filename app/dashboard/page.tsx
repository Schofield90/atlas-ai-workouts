import { createServerClient } from '@/lib/db/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Plus, Users, Dumbbell, ChartBar, Settings } from 'lucide-react'

export default async function DashboardPage() {
  const supabase = await createServerClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Get user's organization
  const { data: userData } = await supabase
    .from('users')
    .select('*, organizations(*)')
    .eq('id', user.id)
    .single()

  // Get recent clients
  const { data: clients } = await supabase
    .from('clients')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5)

  // Get recent workouts
  const { data: workouts } = await supabase
    .from('workouts')
    .select('*, clients(full_name)')
    .order('created_at', { ascending: false })
    .limit(5)

  // Get stats
  const { count: clientCount } = await supabase
    .from('clients')
    .select('*', { count: 'exact', head: true })

  const { count: workoutCount } = await supabase
    .from('workouts')
    .select('*', { count: 'exact', head: true })

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold">
                {userData?.organizations?.name || 'Workout Platform'}
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <Link 
                href="/settings"
                className="text-gray-500 hover:text-gray-700"
                aria-label="Settings"
              >
                <Settings className="h-5 w-5" />
              </Link>
              <span className="text-sm text-gray-700">
                {userData?.full_name || user.email}
              </span>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Link
            href="/builder"
            className="flex items-center justify-center p-6 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-5 w-5 mr-2" />
            <span className="font-medium">Create Workout</span>
          </Link>
          
          <Link
            href="/clients/new"
            className="flex items-center justify-center p-6 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Users className="h-5 w-5 mr-2" />
            <span className="font-medium">Add Client</span>
          </Link>
          
          <Link
            href="/workouts"
            className="flex items-center justify-center p-6 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            <Dumbbell className="h-5 w-5 mr-2" />
            <span className="font-medium">View All Workouts</span>
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-2xl font-bold text-gray-900">{clientCount || 0}</div>
            <div className="text-sm text-gray-500">Total Clients</div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-2xl font-bold text-gray-900">{workoutCount || 0}</div>
            <div className="text-sm text-gray-500">Workouts Created</div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-2xl font-bold text-gray-900">0</div>
            <div className="text-sm text-gray-500">This Week</div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-2xl font-bold text-gray-900">0%</div>
            <div className="text-sm text-gray-500">Completion Rate</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Clients */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b">
              <h2 className="text-lg font-semibold">Recent Clients</h2>
            </div>
            <div className="p-6">
              {clients && clients.length > 0 ? (
                <ul className="space-y-3">
                  {clients.map((client) => (
                    <li key={client.id}>
                      <Link
                        href={`/clients/${client.id}`}
                        className="flex items-center justify-between hover:bg-gray-50 p-2 rounded"
                      >
                        <div>
                          <div className="font-medium">{client.full_name}</div>
                          <div className="text-sm text-gray-500">{client.email}</div>
                        </div>
                        <ChartBar className="h-4 w-4 text-gray-400" />
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-500">No clients yet. Add your first client to get started!</p>
              )}
            </div>
          </div>

          {/* Recent Workouts */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b">
              <h2 className="text-lg font-semibold">Recent Workouts</h2>
            </div>
            <div className="p-6">
              {workouts && workouts.length > 0 ? (
                <ul className="space-y-3">
                  {workouts.map((workout) => (
                    <li key={workout.id}>
                      <Link
                        href={`/workouts/${workout.id}`}
                        className="flex items-center justify-between hover:bg-gray-50 p-2 rounded"
                      >
                        <div>
                          <div className="font-medium">{workout.title}</div>
                          <div className="text-sm text-gray-500">
                            {workout.clients?.full_name}
                          </div>
                        </div>
                        <span className="text-xs text-gray-400">
                          {new Date(workout.created_at).toLocaleDateString()}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-500">No workouts yet. Create your first AI-powered workout!</p>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}