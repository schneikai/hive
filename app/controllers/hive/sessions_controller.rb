module Hive
  class SessionsController < Devise::SessionsController
    before_filter -> { store_location_for 'user', previous_location_for('user') }, only: :new
  end
end
