-- Create vehicles table
CREATE TABLE IF NOT EXISTS public.vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  vehicle_number TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL, -- 'truck', 'van', 'car', etc.
  tracking_type TEXT NOT NULL DEFAULT 'mobile_app', -- 'gps_device', 'mobile_app', 'both'
  device_id TEXT, -- For GPS hardware devices
  assigned_driver_id UUID REFERENCES auth.users(id),
  status TEXT DEFAULT 'active', -- 'active', 'inactive', 'maintenance'
  make TEXT,
  model TEXT,
  year INTEGER,
  license_plate TEXT,
  vin TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create location history table
CREATE TABLE IF NOT EXISTS public.location_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  tracking_source TEXT NOT NULL, -- 'device', 'mobile'
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  speed DECIMAL(5, 2), -- in mph or km/h
  heading DECIMAL(5, 2), -- degrees 0-360
  altitude DECIMAL(8, 2), -- in meters
  accuracy DECIMAL(6, 2), -- in meters
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create geofences table
CREATE TABLE IF NOT EXISTS public.geofences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL DEFAULT 'circle', -- 'circle', 'polygon'
  center_lat DECIMAL(10, 8),
  center_lng DECIMAL(11, 8),
  radius DECIMAL(10, 2), -- in meters, for circle type
  polygon_coords JSONB, -- for polygon type: [{lat, lng}, ...]
  alert_on_enter BOOLEAN DEFAULT false,
  alert_on_exit BOOLEAN DEFAULT false,
  active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create geofence alerts table
CREATE TABLE IF NOT EXISTS public.geofence_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  geofence_id UUID NOT NULL REFERENCES public.geofences(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL, -- 'enter', 'exit'
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  acknowledged BOOLEAN DEFAULT false,
  acknowledged_by UUID REFERENCES auth.users(id),
  acknowledged_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create GPS settings table
CREATE TABLE IF NOT EXISTS public.gps_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.location_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.geofences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.geofence_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gps_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for vehicles
CREATE POLICY "Staff can view all vehicles"
  ON public.vehicles FOR SELECT
  USING (
    has_role(auth.uid(), 'worker'::app_role) OR 
    has_role(auth.uid(), 'manager'::app_role) OR 
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'super_admin'::app_role)
  );

CREATE POLICY "Admins can manage vehicles"
  ON public.vehicles FOR ALL
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'super_admin'::app_role)
  );

-- RLS Policies for location_history
CREATE POLICY "Staff can view location history"
  ON public.location_history FOR SELECT
  USING (
    has_role(auth.uid(), 'worker'::app_role) OR 
    has_role(auth.uid(), 'manager'::app_role) OR 
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'super_admin'::app_role)
  );

CREATE POLICY "System can insert location history"
  ON public.location_history FOR INSERT
  WITH CHECK (true);

-- RLS Policies for geofences
CREATE POLICY "Staff can view geofences"
  ON public.geofences FOR SELECT
  USING (
    has_role(auth.uid(), 'worker'::app_role) OR 
    has_role(auth.uid(), 'manager'::app_role) OR 
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'super_admin'::app_role)
  );

CREATE POLICY "Managers can manage geofences"
  ON public.geofences FOR ALL
  USING (
    has_role(auth.uid(), 'manager'::app_role) OR 
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'super_admin'::app_role)
  );

-- RLS Policies for geofence_alerts
CREATE POLICY "Staff can view geofence alerts"
  ON public.geofence_alerts FOR SELECT
  USING (
    has_role(auth.uid(), 'worker'::app_role) OR 
    has_role(auth.uid(), 'manager'::app_role) OR 
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'super_admin'::app_role)
  );

CREATE POLICY "System can insert geofence alerts"
  ON public.geofence_alerts FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Managers can acknowledge alerts"
  ON public.geofence_alerts FOR UPDATE
  USING (
    has_role(auth.uid(), 'manager'::app_role) OR 
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'super_admin'::app_role)
  );

-- RLS Policies for gps_settings
CREATE POLICY "Staff can view GPS settings"
  ON public.gps_settings FOR SELECT
  USING (
    has_role(auth.uid(), 'worker'::app_role) OR 
    has_role(auth.uid(), 'manager'::app_role) OR 
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'super_admin'::app_role)
  );

CREATE POLICY "Admins can manage GPS settings"
  ON public.gps_settings FOR ALL
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'super_admin'::app_role)
  );

-- Create indexes for better performance
CREATE INDEX idx_location_history_vehicle_timestamp ON public.location_history(vehicle_id, timestamp DESC);
CREATE INDEX idx_location_history_timestamp ON public.location_history(timestamp DESC);
CREATE INDEX idx_geofence_alerts_vehicle ON public.geofence_alerts(vehicle_id, timestamp DESC);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_vehicles_updated_at
  BEFORE UPDATE ON public.vehicles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_geofences_updated_at
  BEFORE UPDATE ON public.geofences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable realtime for location updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.location_history;
ALTER PUBLICATION supabase_realtime ADD TABLE public.geofence_alerts;