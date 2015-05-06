module Hive
  module Helpers
    # Returns the Hive background images.
    # Possible keys: confirmations, passwords, registrations, sessions, unlocks.
    # Key "default" is used if a more specific key does not exist.
    def hive_backgrounds
      {
        'default' => { image: asset_url('hive/foo.jpg'), author: 'foo / photocase', source: '/' }
      }
    end

    # Returns the current controller name. This is used in the
    # Hive background methods to get the right background for the current view.
    def hive_location
      "#{controller_name}"
    end

    # Returns a hash with the Hive background image for the current view or a default image.
    # hive_background_image
    #   => { image: asset_url('hive/676143.jpg'), author: 'kai / photocase', source: '/photodetail.asp?i=676143' }
    def hive_background_image
      (hive_backgrounds[hive_location] || hive_backgrounds['default'])
    end

    # Returns true if account confirmation is required and the current user
    # hasn't confirmed his account yet. Otherwise false.
    def user_need_confirmation?
      user_mapping.confirmable? && user_signed_in? && !current_user.confirmed?
    end

    # Returns true if account confirmation is required and the current user
    # recently changed his email address but hasn't confirmed it yet. Otherwise false.
    def user_need_reconfirmation?
      user_mapping.confirmable? && user_signed_in? && current_user.pending_reconfirmation?
    end

    # Returns the Devise mapping for the current user.
    def user_mapping
      @user_mapping ||= Devise.mappings[:user]
    end
  end
end
