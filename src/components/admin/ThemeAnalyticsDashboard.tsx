import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import { TrendingUp, Users, Star, Eye, Activity, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658'];

interface ThemeStats {
  theme_name: string;
  unique_users: number;
  activation_count: number;
  preview_count: number;
  favorite_count: number;
  avg_session_duration: number | null;
  last_used_at: string;
}

export const ThemeAnalyticsDashboard = () => {
  const { data: themeStats, isLoading } = useQuery({
    queryKey: ["theme-analytics"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("theme_analytics")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Aggregate data manually since we can't query the view directly
      const statsMap = new Map<string, ThemeStats>();
      const usersByTheme = new Map<string, Set<string>>();

      data.forEach((record) => {
        if (!statsMap.has(record.theme_name)) {
          statsMap.set(record.theme_name, {
            theme_name: record.theme_name,
            unique_users: 0,
            activation_count: 0,
            preview_count: 0,
            favorite_count: 0,
            avg_session_duration: null,
            last_used_at: record.created_at,
          });
          usersByTheme.set(record.theme_name, new Set());
        }

        const stats = statsMap.get(record.theme_name)!;
        const users = usersByTheme.get(record.theme_name)!;
        
        users.add(record.user_id);
        
        if (record.action_type === 'activate') stats.activation_count++;
        if (record.action_type === 'preview') stats.preview_count++;
        if (record.action_type === 'favorite') stats.favorite_count++;
        
        if (record.created_at > stats.last_used_at) {
          stats.last_used_at = record.created_at;
        }
      });

      // Calculate average session duration and unique users
      statsMap.forEach((stats, themeName) => {
        const themeRecords = data.filter(r => r.theme_name === themeName && r.session_duration);
        if (themeRecords.length > 0) {
          const totalDuration = themeRecords.reduce((sum, r) => sum + (r.session_duration || 0), 0);
          stats.avg_session_duration = totalDuration / themeRecords.length;
        }
        stats.unique_users = usersByTheme.get(themeName)!.size;
      });

      return Array.from(statsMap.values()).sort((a, b) => b.activation_count - a.activation_count);
    },
  });

  const { data: recentActivity } = useQuery({
    queryKey: ["theme-recent-activity"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("theme_analytics")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return data;
    },
  });

  const { data: switchFrequency } = useQuery({
    queryKey: ["theme-switch-frequency"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("theme_analytics")
        .select("user_id, theme_name, created_at")
        .eq("action_type", "activate")
        .order("created_at", { ascending: true });

      if (error) throw error;

      // Calculate switches per user
      const userSwitches = new Map<string, number>();
      const userThemes = new Map<string, string[]>();

      data.forEach((record) => {
        if (!userThemes.has(record.user_id)) {
          userThemes.set(record.user_id, []);
        }
        const themes = userThemes.get(record.user_id)!;
        if (themes[themes.length - 1] !== record.theme_name) {
          themes.push(record.theme_name);
          userSwitches.set(record.user_id, (userSwitches.get(record.user_id) || 0) + 1);
        }
      });

      const avgSwitches = Array.from(userSwitches.values()).reduce((a, b) => a + b, 0) / Math.max(userSwitches.size, 1);

      return {
        totalUsers: userSwitches.size,
        avgSwitches: Math.round(avgSwitches * 10) / 10,
        highestSwitches: Math.max(...Array.from(userSwitches.values()), 0),
      };
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Theme Analytics Dashboard</CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const topThemes = themeStats?.slice(0, 5) || [];
  const totalActivations = themeStats?.reduce((sum, t) => sum + t.activation_count, 0) || 0;
  const totalPreviews = themeStats?.reduce((sum, t) => sum + t.preview_count, 0) || 0;
  const totalFavorites = themeStats?.reduce((sum, t) => sum + t.favorite_count, 0) || 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Theme Analytics Dashboard
        </CardTitle>
        <CardDescription>
          Insights into theme usage, popularity, and user engagement
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="popularity">Popularity</TabsTrigger>
            <TabsTrigger value="engagement">Engagement</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Activations</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{totalActivations}</div>
                  <p className="text-xs text-muted-foreground">Theme switches</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Preview Count</CardTitle>
                  <Eye className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{totalPreviews}</div>
                  <p className="text-xs text-muted-foreground">Theme previews</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Favorites</CardTitle>
                  <Star className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{totalFavorites}</div>
                  <p className="text-xs text-muted-foreground">Bookmarked themes</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Avg Switches</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{switchFrequency?.avgSwitches || 0}</div>
                  <p className="text-xs text-muted-foreground">Per user</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Top 5 Most Popular Themes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {topThemes.map((theme, index) => (
                    <div key={theme.theme_name} className="flex items-center gap-4">
                      <Badge variant="outline" className="w-8 h-8 flex items-center justify-center">
                        {index + 1}
                      </Badge>
                      <div className="flex-1">
                        <div className="font-medium">{theme.theme_name}</div>
                        <div className="text-sm text-muted-foreground">
                          {theme.unique_users} users • {theme.activation_count} activations
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Badge variant="secondary">
                          <Eye className="h-3 w-3 mr-1" />
                          {theme.preview_count}
                        </Badge>
                        <Badge variant="secondary">
                          <Star className="h-3 w-3 mr-1" />
                          {theme.favorite_count}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="popularity" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Theme Activation Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={themeStats?.slice(0, 10)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="theme_name" angle={-45} textAnchor="end" height={100} />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="activation_count" fill="#8884d8" name="Activations" />
                    <Bar dataKey="preview_count" fill="#82ca9d" name="Previews" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>User Distribution by Theme</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={themeStats?.slice(0, 7)}
                      dataKey="unique_users"
                      nameKey="theme_name"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label={(entry) => `${entry.theme_name} (${entry.unique_users})`}
                    >
                      {themeStats?.slice(0, 7).map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="engagement" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Average Session Duration</CardTitle>
                <CardDescription>Time spent using each theme (in seconds)</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={themeStats?.filter(t => t.avg_session_duration)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="theme_name" angle={-45} textAnchor="end" height={100} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="avg_session_duration" fill="#ffc658" name="Avg Duration (s)" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Engagement Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {themeStats?.map((theme) => (
                    <div key={theme.theme_name} className="border-b pb-3 last:border-0">
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-medium">{theme.theme_name}</span>
                        <Badge>{theme.unique_users} users</Badge>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <div className="text-muted-foreground">Activations</div>
                          <div className="font-semibold">{theme.activation_count}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Favorites</div>
                          <div className="font-semibold">{theme.favorite_count}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Avg Duration</div>
                          <div className="font-semibold">
                            {theme.avg_session_duration 
                              ? `${Math.round(theme.avg_session_duration)}s`
                              : 'N/A'}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="activity" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Recent Theme Activity</CardTitle>
                <CardDescription>Latest 50 theme-related actions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-[500px] overflow-y-auto">
                  {recentActivity?.map((activity) => (
                    <div key={activity.id} className="flex items-center justify-between py-2 border-b last:border-0">
                      <div className="flex items-center gap-3">
                        <Badge variant={
                          activity.action_type === 'activate' ? 'default' :
                          activity.action_type === 'favorite' ? 'secondary' :
                          'outline'
                        }>
                          {activity.action_type}
                        </Badge>
                        <span className="font-medium">{activity.theme_name}</span>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {new Date(activity.created_at).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
