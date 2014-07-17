module Hive
  module Helpers
    # Use this instead of <tt>I18n.translate</tt> to scope translations to the
    # current hive controller and action.
    #
    #   <%= hive_translate '.title' %>
    #   => t('hive.registrations.edit.title')
    #
    def hive_translate(scope, options={})
      if scope.first == '.'
        options[:base] ||= 'hive'
        options[:controller] ||= controller_name

        # ConfirmationsController is using the +show+ action to validate
        # confirmation tokens from urls. If such token is not valid it renders
        # +new+ so we alias +show+ to +new+ here so we don't have to add
        # translations for the same thing twice.
        if options[:action].blank? && options[:controller] == 'confirmations' && action_name == 'show'
          options[:action] = 'new'
        end

        # For translation scopes we don't need to differentiate between new/create
        # and edit/update actions.
        options[:action] ||= { 'create' => 'new', 'update' => 'edit' }[action_name] || action_name

        scope = "#{options[:base]}.#{options[:controller]}.#{options[:action]}#{scope}"
      end

      t(scope)
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

    # Sets or gets the title for a hive view.
    #
    # To set the title in a view use:
    #
    #   <% hive_title 'Please Sign-In' %>
    #
    # If you want to create a headline and a title at the same time use:
    #
    #   <h1><%= hive_title 'Please Sign-In' %></h1>
    #
    # To display this title in your layout use
    #
    #   <title><%= hive_title %></title>
    #
    # If you use a custom way of setting titles in views and displaying them
    # in your layout you can just overwrite this method.
    def hive_title(title=nil)
      if title.nil?
        content_for?(:hive_title) ? content_for(:hive_title) : Hive.app_name
      else
        content_for :hive_title, "#{title} - #{Hive.app_name}"
      end
      title
    end

    # Add the Hive animation class to a element in a view if animations
    # are enabled (default) in the Hive initializer.
    def hive_animation_class
      "hive-animated" if Hive.animate_views
    end
  end
end
